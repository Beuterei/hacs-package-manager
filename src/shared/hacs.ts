export interface Defaults {
    appdaemon: string[];
    integration: string[];
    netdaemon: string[];
    plugins: string[];
    pythonScript: string[];
    template: string[];
    theme: string[];
}

export interface RemoteHacsConfig {
    content_in_root?: boolean;
    filename?: string;
    hide_default_branch?: boolean;
    name: string;
    persistent_directory?: string;
    zip_release?: boolean;
}

export const isRemoteHacsConfig = (object: unknown): object is HacsConfig =>
    typeof object === 'object' &&
    object !== null &&
    'name' in object &&
    typeof object.name === 'string' &&
    ('content_in_root' in object ? typeof object.content_in_root === 'string' : true) &&
    ('filename' in object ? typeof object.filename === 'string' : true) &&
    ('hide_default_branch' in object ? typeof object.hide_default_branch === 'string' : true) &&
    ('persistent_directory' in object ? typeof object.persistent_directory === 'string' : true) &&
    ('zip_release' in object ? typeof object.zip_release === 'string' : true);

export interface HacsConfig {
    contentInRoot?: boolean;
    filename?: string;
    hideDefaultBranch?: boolean;
    name: string;
    persistentDirectory?: string;
    zipRelease?: boolean;
}
