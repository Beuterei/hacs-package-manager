import { type HacsConfig, type RemoteHacsConfig } from '../shared/hacs';

export class HacsConfigMapper {
    public mapRemoteHacsConfigToHacsConfig(remoteHacsConfig: RemoteHacsConfig): HacsConfig {
        return {
            contentInRoot:
                typeof remoteHacsConfig.content_in_root === 'string'
                    ? remoteHacsConfig.content_in_root.toLowerCase() === 'true'
                    : remoteHacsConfig.content_in_root,
            filename: remoteHacsConfig.filename,
            hideDefaultBranch:
                typeof remoteHacsConfig.hide_default_branch === 'string'
                    ? remoteHacsConfig.hide_default_branch.toLowerCase() === 'true'
                    : remoteHacsConfig.hide_default_branch,
            name: remoteHacsConfig.name,
            persistentDirectory: remoteHacsConfig.persistent_directory,
            zipRelease:
                typeof remoteHacsConfig.zip_release === 'string'
                    ? remoteHacsConfig.zip_release.toLowerCase() === 'true'
                    : remoteHacsConfig.zip_release,
        };
    }
}
