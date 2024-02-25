import { constructSubDirectory } from '../../util/dependency.helper';
import { GitHubService } from '../github.service';
import type { CategoryDependencyService } from './category-dependency-service.interface';

export class IntegrationDependencyService implements CategoryDependencyService {
    public constructor(private gitHubService = new GitHubService()) {}

    public getLocalDependencyPath(
        haConfigPath: string,
        repositorySlug: string,
        remoteFile?: string,
    ): string {
        return `${haConfigPath}/custom_components/${constructSubDirectory(
            repositorySlug,
            remoteFile,
        )}/`;
    }

    public async resolveDependencyArtifacts(
        _repositorySlug: string,
        _ref: string,
    ): Promise<{ files: string[] }> {
        throw new Error('Method not implemented.');
    }
}
