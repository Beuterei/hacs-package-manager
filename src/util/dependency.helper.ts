export const constructSubDirectory = (repositorySlug: string, remoteFile?: string): string => {
    if (remoteFile) {
        const remoteFileParts = remoteFile
            .split('/')
            .filter(
                (part) => part !== 'apps' && part !== 'appdaemon' && part !== 'custom_components',
            )
            .slice(0, -1);
        if (remoteFileParts.length >= 1) {
            return remoteFileParts.join('/');
        }
    }

    return repositorySlug.split('/')[1];
};
