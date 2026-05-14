export type PrimitiveKind =
  | 'region' | 'toggle' | 'value' | 'input' | 'textarea' | 'slider'
  | 'checkbox' | 'switch' | 'form' | 'image' | 'video' | 'audio'
  | 'wysiwyg' | 'tabs' | 'accordion' | 'popover' | 'tooltip' | 'drawer'
  | 'wizard' | 'capture' | 'progress' | 'menu' | 'select'
  | 'network-status' | 'theme-toggle' | 'theme-switch' | 'lang-switcher'
  | 'card' | 'alert' | 'spinner' | 'empty-state' | 'error-panel'
  | 'pagination' | 'breadcrumb' | 'command-palette'
  | 'badge' | 'avatar' | 'skeleton' | 'page'
  | 'combobox' | 'date-picker' | 'file-upload' | 'dropzone'
  | 'search-bar' | 'tree-nav' | 'notifications'
  | 'data-grid' | 'table-virtual' | 'table'
  | 'splash' | 'radio-group' | 'link' | 'mega-menu' | 'context-menu'
  | 'button' | 'modal' | 'panel' | 'dropdown' | 'lightbox'
  | 'field' | 'field-array'
  | 'toast-container' | 'toast' | 'consent-banner'
  | 'gate-auth' | 'gate-anon' | 'gate-role' | 'gate-scope' | 'gate-feature'
  | 'nav';

export interface PrimitiveDefinition {
  tag: string;
  role?: string;
  kind: PrimitiveKind;
  stateAttr?: string;
  family: string;
  formAssociated?: boolean;
}

export const TOGGLE_KIND = new Set<PrimitiveKind>(['toggle', 'checkbox', 'switch']);
