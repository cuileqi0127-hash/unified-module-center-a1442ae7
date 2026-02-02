declare module 'jszip' {
  interface JSZipFileOptions {
    base64?: boolean;
    binary?: boolean;
    date?: Date;
    dir?: boolean;
    compression?: string;
    compressionOptions?: any;
    comment?: string;
    createFolders?: boolean;
    unixPermissions?: number | string;
    dosPermissions?: number | null;
  }

  interface JSZipGenerateOptions {
    base64?: boolean;
    compression?: string;
    compressionOptions?: any;
    type?: 'string' | 'base64' | 'array' | 'uint8array' | 'arraybuffer' | 'blob' | 'nodebuffer';
    comment?: string;
    mimeType?: string;
    platform?: 'DOS' | 'UNIX';
    encodeFileName?: (fileName: string) => string;
    streamFiles?: boolean;
  }

  class JSZip {
    files: { [key: string]: JSZipObject };

    file(name: string, data: string | ArrayBuffer | Uint8Array | Blob, options?: JSZipFileOptions): JSZip;
    folder(name: string): JSZip;
    remove(name: string): JSZip;
    generateAsync(options?: JSZipGenerateOptions): Promise<any>;
    loadAsync(data: any, options?: any): Promise<JSZip>;
  }

  interface JSZipObject {
    name: string;
    dir: boolean;
    date: Date;
    comment: string | null;
    uncompressedSize: number;
    crc32: number;
  }

  export = JSZip;
}
