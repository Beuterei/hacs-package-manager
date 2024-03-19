[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]

<!-- PROJECT HEADER -->
<br />
<p align="center">
  <h3 align="center">hacs-package-manager</h3>

  <p align="center">
    A package manager build on top of hacs.
    <br />
    <br />
    ·
    <a href="https://github.com/Beuterei/hacs-package-manager/issues">Report Bug</a>
    ·
    <a href="https://github.com/Beuterei/hacs-package-manager/issues">Request Feature</a>
    ·
  </p>
</p>

<!-- ABOUT THE PROJECT -->

## About The Project

I use docker-containers to run home assistant. Since I am a big fan of configuration as code ([CAC](https://www.cloudbees.com/blog/configuration-as-code-everything-need-know)) and pushing everything to git is not the best idea, I was inspired to develop this package manager.

The package manager is build on top of [hacs](https://hacs.xyz/) and its already established ecosystem and uses the hpm.json (Similar to `package.json` and `package-lock.json` in npm) file to manage the dependencies. It is a command line tool that allows you to add, remove and install dependencies to home assistant.

I decided to mostly follow the concepts of hacs but decided to teak some aspects to enable and enforce CAC concepts.
The main difference here is that, no matter the configuration of the repository provided for hacs, the package manager always resolves the corresponding git reference and uses this to pin the version of the dependency. That way, the package manager ensures that the configuration is always reproducible.

### `hpm.json` files idea and concept

The `hpm.json` file is storing all installed dependencies.

The file is inspired by the `package.json` file of `npm` and `yarn`.

I designed it with the following concepts in mind:

- **Reproducible**: The file should be able to reproduce the exact same installation on any machine.
- **Local installation agnostic**: Nothing in the file is specific to a particular local installation.

#### Reproducible

To archive this the package manager always resolves the corresponding git reference and uses this to pin the version of the dependency. That way, the package manager ensures that the configuration is always reproducible.

All other fields and values always base on top of that git reference.

#### Local installation agnostic

The file should be able to reproduce the exact same installation on any machine. Therefore, the file does not contain any local installation specific information.

We never know where the user wants to install the dependencies. We only know what git reference to install and context about this reference.

## Installation

## MacOS

```bash
brew install Beuterei/homebrew-tap/hpm
```

or without brew

```bash
curl -L https://github.com/Beuterei/hacs-package-manager/releases/latest/download/hpm-macos >/usr/local/bin/hpm
chmod +x /usr/local/bin/hpm
```

## Linux

```bash
curl -L https://github.com/Beuterei/hacs-package-manager/releases/latest/download/hpm-linux >/usr/local/bin/hpm
chmod +x /usr/local/bin/hpm
```

## Usage

The API is inspired by the `yarn` and `npm` package manager. The following commands are available:

### Add a dependency

Adds a particular package or multiple packages to home assistant.

```bash
hpm add [DEPENDENCIES...] [OPTIONS]
```

#### Arguments

- `DEPENDENCIES`: One or multiple packages to add to home assistant. Refs can be specified using a `@` separator: `repositorySlug@ref`.

#### Options

- `-c, --configPath="hpm.json"`: Path to the hpm.json file relative to the current working directory.

### Install dependencies

Installs all dependencies defined in the hpm.json file. Before installing in removes all local dependencies files to ensure a clean install.

```bash
hpm ci [OPTIONS]
```

#### Options

- `-c, --configPath="hpm.json"`: Path to the hpm.json file relative to the current working directory.
- `-h, --haConfigPath="path/to/home-assistant"`: Path where to install dependencies relative to the current working directory.

### Configuration

Configure the CLI.

Currently following keys can be set and retrieved:

- `gitHubToken`: The GitHub token to use for the GitHub API.

The configuration is stored in the `.npmrc` file of the users profile.

This can currently not be changed.

#### Set configuration value

Set a configuration value.

```bash
hpm config set [OPTIONS] <KEY> <VALUE>
```

##### Arguments

- `KEY`: The key to set.
- `VALUE`: The value to set.

#### Get configuration value

Get a configuration value

```bash
hpm config get [OPTIONS] [KEY]
```

or get the full configuration.

```bash
hpm config get [OPTIONS]
```

##### Arguments

- `KEY`: The key to get

### Remove a dependency

Removes a particular package or multiple packages from home assistant.

```bash
hpm remove [DEPENDENCIES...] [OPTIONS]
```

#### Options

- `-c, --configPath="hpm.json"`: Path to the hpm.json file relative to the current working directory.
- `-h, --haConfigPath="path/to/home-assistant"`: Path where to install dependencies relative to the current working directory.

### Practical example

Look at my own HA setup: https://github.com/Beuterei/home-assistant

## Caching

The package manager caches [default repositories](https://github.com/hacs/default) of hacs to speed up the process. The cache is stored in the `.hpm` directory of the users profile directory.

This can currently not be changed.

## Local development

You can use the `dev` commands to help you with local development.

### Add all dependencies of a category

Adds all dependencies of a category to home assistant.

```bash
hpm dev test add [OPTIONS] <TYPE>
```

#### Arguments

- `TYPE`: The type of the dependencies to add. (`appdaemon`, `integration`, `netdaemon`, `plugin`, `pythonScript`, `template`, `theme`)

#### Options

- `--deleteHpm"`: Delete the hpm file before adding the dependencies.

## TODOs

- [ ] Add tests
- [ ] Add CI/CD

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[contributors-shield]: https://img.shields.io/github/contributors/Beuterei/hacs-package-manager.svg?style=flat-square
[contributors-url]: https://github.com/Beuterei/hacs-package-manager/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Beuterei/hacs-package-manager.svg?style=flat-square
[forks-url]: https://github.com/Beuterei/hacs-package-manager/network/members
[stars-shield]: https://img.shields.io/github/stars/Beuterei/hacs-package-manager.svg?style=flat-square
[stars-url]: https://github.com/Beuterei/hacs-package-manager/stargazers
[issues-shield]: https://img.shields.io/github/issues/Beuterei/hacs-package-manager.svg?style=flat-square
[issues-url]: https://github.com/Beuterei/hacs-package-manager/issues
[license-shield]: https://img.shields.io/github/license/Beuterei/hacs-package-manager.svg?style=flat-square
