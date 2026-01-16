
export enum ElementType {
  ARTBOARD = 'ARTBOARD',
  RECTANGLE = 'RECTANGLE',
  TEXT = 'TEXT'
}

export interface SketchElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  parentId?: string; // ID of the parent Artboard
  color?: string;
  opacity?: number;
  text?: string;
  fontSize?: number;
}

export interface LayoutSpec {
  title: string;
  elements: SketchElement[];
}
