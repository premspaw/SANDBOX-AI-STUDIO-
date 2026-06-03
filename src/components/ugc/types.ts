export interface KnowledgeBaseEntry {
  id: string;
  name: string;
  content: string;
}

export interface GalleryItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt?: string;
}

export interface TimelineItem {
  id: string;
  url: string;
  start: number;
  end: number;
  duration: number;
  type: 'video' | 'audio';
  originalFile?: File;
}

export interface Scene {
  id: string;
  text?: string;
  prompt: string;
  isApproved: boolean;
  visualCue?: string;
  timestamp?: string;
  label?: string;
  image?: string;
}
