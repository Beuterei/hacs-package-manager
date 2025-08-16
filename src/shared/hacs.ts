export interface Defaults {
    appdaemon: string[];
    integration: string[];
    netdaemon: string[];
    plugin: string[];
    pythonScript: string[];
    template: string[];
    theme: string[];
}

export interface RemoteHacsConfig {
    content_in_root?: 'false' | 'true' | boolean;
    filename?: string;
    hide_default_branch?: 'false' | 'true' | boolean;
    name?: string;
    persistent_directory?: string;
    zip_release?: 'false' | 'true' | boolean;
}

export const isRemoteHacsConfig = (object: unknown): object is RemoteHacsConfig =>
    typeof object === 'object' &&
    object !== null &&
    ('name' in object ? typeof object.name === 'string' : true) &&
    ('content_in_root' in object
        ? typeof object.content_in_root === 'boolean' ||
          object.content_in_root === 'true' ||
          object.content_in_root === 'false'
        : true) &&
    ('filename' in object ? typeof object.filename === 'string' : true) &&
    ('hide_default_branch' in object
        ? typeof object.hide_default_branch === 'boolean' ||
          object.hide_default_branch === 'true' ||
          object.hide_default_branch === 'false'
        : true) &&
    ('persistent_directory' in object ? typeof object.persistent_directory === 'string' : true) &&
    ('zip_release' in object
        ? typeof object.zip_release === 'boolean' ||
          object.zip_release === 'true' ||
          object.zip_release === 'false'
        : true);

export interface HacsConfig {
    contentInRoot?: boolean;
    filename?: string;
    hideDefaultBranch?: boolean;
    name?: string;
    persistentDirectory?: string;
    zipRelease?: boolean;
}
