import type { HacsConfig, RemoteHacsConfig } from '../shared/hacs';

export class HacsConfigMapper {
    public mapRemoteHacsConfigToHacsConfig(remoteHacsConfig: RemoteHacsConfig): HacsConfig {
        return {
            name: remoteHacsConfig.name,
            contentInRoot: remoteHacsConfig.content_in_root,
            filename: remoteHacsConfig.filename,
            hideDefaultBranch: remoteHacsConfig.hide_default_branch,
            persistentDirectory: remoteHacsConfig.persistent_directory,
            zipRelease: remoteHacsConfig.zip_release,
        };
    }
}
