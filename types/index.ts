export interface Plugin {
  id: string;
  pluginId: string;
  name: string;
  author: string | null;
  version: number;
  code: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  config: string | null;
}