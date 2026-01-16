
import JSZip from 'jszip';
import { LayoutSpec, ElementType, SketchElement } from '../types';

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
};

const createLayer = (el: SketchElement) => {
  const isArtboard = el.type === ElementType.ARTBOARD;
  
  const layer: any = {
    _class: isArtboard ? 'artboard' : (el.type === ElementType.TEXT ? 'text' : 'rectangle'),
    do_objectID: el.id || generateUUID(),
    booleanOperation: -1,
    isFixedToViewport: false,
    isFlippedHorizontal: false,
    isFlippedVertical: false,
    isLocked: false,
    isVisible: true,
    layerListExpandedType: 0,
    name: el.name,
    nameIsFixed: false,
    resizingConstraint: 63,
    resizingType: 0,
    rotation: 0,
    shouldBreakMaskChain: false,
    exportOptions: {
      _class: 'exportOptions',
      exportFormats: [],
      includedLayerIds: [],
      layerOptions: 0,
      shouldTrim: false
    },
    frame: {
      _class: 'rect',
      constrainProportions: false,
      height: el.height,
      width: el.width,
      x: el.x,
      y: el.y
    },
    clippingMaskMode: 0,
    hasClippingMask: false,
    style: {
      _class: 'style',
      do_objectID: generateUUID(),
      endMarkerType: 0,
      miterLimit: 10,
      startMarkerType: 0,
      windingRule: 1,
      fills: el.color ? [
        {
          _class: 'fill',
          isEnabled: true,
          color: {
            _class: 'color',
            alpha: 1,
            blue: parseInt(el.color.slice(5, 7) || 'CC', 16) / 255,
            green: parseInt(el.color.slice(3, 5) || 'CC', 16) / 255,
            red: parseInt(el.color.slice(1, 3) || 'CC', 16) / 255
          },
          fillType: 0
        }
      ] : []
    }
  };

  if (el.type === ElementType.TEXT) {
    layer.attributedString = {
      _class: 'attributedString',
      string: el.text || el.name,
      attributes: [
        {
          _class: 'stringAttribute',
          location: 0,
          length: (el.text || el.name).length,
          attributes: {
            MSAttributedStringFontAttribute: {
              _class: 'fontDescriptor',
              attributes: { name: 'Helvetica', size: el.fontSize || 14 }
            }
          }
        }
      ]
    };
  }

  if (isArtboard) {
    layer.hasBackgroundColor = true;
    layer.backgroundColor = { _class: 'color', alpha: 1, blue: 1, green: 1, red: 1 };
    layer.layers = [];
  }

  return layer;
};

export const generateSketchFile = async (spec: LayoutSpec): Promise<Blob> => {
  const zip = new JSZip();
  const pageId = generateUUID();
  const docId = generateUUID();

  const meta = {
    commit: '0',
    pagesAndArtboards: {},
    version: 155,
    fonts: [],
    compatibilityVersion: 99,
    app: 'com.bohemiancoding.sketch3',
    autosaved: 0,
    variant: 'MAP',
    created: { commit: '0', app: 'com.bohemiancoding.sketch3', version: 155, build: 0, variant: 'MAP' },
    appVersion: '96.2'
  };

  const user = { [pageId]: { scrollOrigin: '{0, 0}', zoomValue: 1 } };

  const document = {
    _class: 'document',
    do_objectID: docId,
    assets: { _class: 'assetCollection', colors: [], gradients: [], images: [] },
    colorSpace: 0,
    currentPageIndex: 0,
    foreignLayerStyles: [],
    foreignSymbols: [],
    foreignTextStyles: [],
    layerStyles: { _class: 'sharedStyleContainer', objects: [] },
    layerSymbols: { _class: 'symbolContainer', objects: [] },
    layerTextStyles: { _class: 'sharedTextStyleContainer', objects: [] },
    pages: [{ _class: 'MSJSONFileReference', _ref_class: 'MSImmutablePage', _ref: `pages/${pageId}` }]
  };

  // Build the hierarchy
  const artboardElements = spec.elements.filter(e => e.type === ElementType.ARTBOARD);
  const otherElements = spec.elements.filter(e => e.type !== ElementType.ARTBOARD);

  const artboardMap: Record<string, any> = {};
  artboardElements.forEach(el => {
    artboardMap[el.id] = createLayer(el);
  });

  const orphans: any[] = [];
  otherElements.forEach(el => {
    const layer = createLayer(el);
    if (el.parentId && artboardMap[el.parentId]) {
      artboardMap[el.parentId].layers.push(layer);
    } else {
      orphans.push(layer);
    }
  });

  const page = {
    _class: 'page',
    do_objectID: pageId,
    name: 'Page 1',
    layers: [...Object.values(artboardMap), ...orphans],
    frame: { _class: 'rect', constrainProportions: false, height: 0, width: 0, x: 0, y: 0 },
    horizontalRulerData: { _class: 'rulerData', base: 0, guides: [] },
    verticalRulerData: { _class: 'rulerData', base: 0, guides: [] }
  };

  zip.file('meta.json', JSON.stringify(meta));
  zip.file('user.json', JSON.stringify(user));
  zip.file('document.json', JSON.stringify(document));
  zip.folder('pages').file(`${pageId}.json`, JSON.stringify(page));

  return await zip.generateAsync({ type: 'blob' });
};
