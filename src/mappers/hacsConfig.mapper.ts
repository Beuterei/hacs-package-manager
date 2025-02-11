import type { HacsConfig, RemoteHacsConfig } from '../shared/hacs';

export class HacsConfigMapper {
    public mapRemoteHacsConfigToHacsConfig(remoteHacsConfig: RemoteHacsConfig): HacsConfig {
        return {
            name: remoteHacsConfig.name,
            contentInRoot:
                typeof remoteHacsConfig.content_in_root === 'string'
                    ? remoteHacsConfig.content_in_root.toLowerCase() === 'true'
                    : remoteHacsConfig.content_in_root,
            hideDefaultBranch:
                typeof remoteHacsConfig.hide_default_branch === 'string'
                    ? remoteHacsConfig.hide_default_branch.toLowerCase() === 'true'
                    : remoteHacsConfig.hide_default_branch,
            filename: remoteHacsConfig.filename,
            persistentDirectory: remoteHacsConfig.persistent_directory,
            zipRelease:
                typeof remoteHacsConfig.zip_release === 'string'
                    ? remoteHacsConfig.zip_release.toLowerCase() === 'true'
                    : remoteHacsConfig.zip_release,
        };
    }
}
