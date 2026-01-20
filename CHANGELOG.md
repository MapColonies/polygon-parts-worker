# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [2.1.0](https://github.com/MapColonies/polygon-parts-worker/compare/v2.0.0...v2.1.0) (2026-01-20)


### Features

* update infrastructure with new workflows, dependency management and Node.js version ([#47](https://github.com/MapColonies/polygon-parts-worker/issues/47)) ([8e75fcc](https://github.com/MapColonies/polygon-parts-worker/commit/8e75fcc46bc68820a9261676f9631f1bc6e18c24))


### Bug Fixes

* set release-please manifest to version 2.0.0 ([#61](https://github.com/MapColonies/polygon-parts-worker/issues/61)) ([ecc518c](https://github.com/MapColonies/polygon-parts-worker/commit/ecc518c7f8731441ab25352aaebf6d8c7c6af9c3))

## [2.0.0](https://github.com/MapColonies/polygon-parts-worker/compare/v2.0.0-alpha.3...v2.0.0) (2026-01-19)

## [2.0.0-alpha.3](https://github.com/MapColonies/polygon-parts-worker/compare/v2.0.0-alpha.1...v2.0.0-alpha.3) (2026-01-04)


### Bug Fixes

* callback race condition ([#45](https://github.com/MapColonies/polygon-parts-worker/issues/45)) ([0820201](https://github.com/MapColonies/polygon-parts-worker/commit/08202010b2e0ebd4feab916b9216503ded872ff6))

## [2.0.0-alpha.2](https://github.com/MapColonies/polygon-parts-worker/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2025-12-31)

## [2.0.0-alpha.1](https://github.com/MapColonies/polygon-parts-worker/compare/v2.0.0-alpha.0...v2.0.0-alpha.1) (2025-12-30)


### Bug Fixes

* update job status to IN_PROGRESS during ingestion validation processing ([#44](https://github.com/MapColonies/polygon-parts-worker/issues/44)) ([57a8d99](https://github.com/MapColonies/polygon-parts-worker/commit/57a8d99e81328c958f04b042e4521fa97fd9b2c4))

## [2.0.0-alpha.0](https://github.com/MapColonies/polygon-parts-worker/compare/v1.8.2...v2.0.0-alpha.0) (2025-12-29)


### ⚠ BREAKING CHANGES

* large capacity ingestion(MAPCO-8067) (#32)

### Features

* shp writer(MAPCO-8369) ([#39](https://github.com/MapColonies/polygon-parts-worker/issues/39)) ([71efe9d](https://github.com/MapColonies/polygon-parts-worker/commit/71efe9d2a4a1c90d01a5beeee0c7a526636026a4)), closes [#35](https://github.com/MapColonies/polygon-parts-worker/issues/35) [#36](https://github.com/MapColonies/polygon-parts-worker/issues/36) [#37](https://github.com/MapColonies/polygon-parts-worker/issues/37) [#38](https://github.com/MapColonies/polygon-parts-worker/issues/38) [#41](https://github.com/MapColonies/polygon-parts-worker/issues/41) [#42](https://github.com/MapColonies/polygon-parts-worker/issues/42) [#43](https://github.com/MapColonies/polygon-parts-worker/issues/43)


* large capacity ingestion(MAPCO-8067) ([#32](https://github.com/MapColonies/polygon-parts-worker/issues/32)) ([64fad57](https://github.com/MapColonies/polygon-parts-worker/commit/64fad57146359e9ed2b84d1aaf9753dac28a8498))

### [1.8.2](https://github.com/MapColonies/polygon-parts-worker/compare/v1.8.1...v1.8.2) (2025-10-21)


### Bug Fixes

* remove internal pvc hardcoded name ([#30](https://github.com/MapColonies/polygon-parts-worker/issues/30)) ([426b16e](https://github.com/MapColonies/polygon-parts-worker/commit/426b16ec5a6cef7702e128771028b7d073c3c267))

### [1.8.1](https://github.com/MapColonies/polygon-parts-worker/compare/v1.8.0...v1.8.1) (2025-08-28)


### Bug Fixes

* handle polygon parts creation failure due to conflict error (MAPCO-8494) ([#29](https://github.com/MapColonies/polygon-parts-worker/issues/29)) ([bda6b5f](https://github.com/MapColonies/polygon-parts-worker/commit/bda6b5f689d9f2a3d865e405c6da4bf9beb2e088))

## [1.8.0](https://github.com/MapColonies/polygon-parts-worker/compare/v1.7.1...v1.8.0) (2025-05-07)


### Features

* add zoom manipulation to max resolution on polygonParts(MAPCO-7091) ([#27](https://github.com/MapColonies/polygon-parts-worker/issues/27)) ([b6e79f1](https://github.com/MapColonies/polygon-parts-worker/commit/b6e79f16892c82b58d9394f3a2e49092d192bd16))

### [1.7.1](https://github.com/MapColonies/polygon-parts-worker/compare/v1.7.0...v1.7.1) (2025-03-12)


### Bug Fixes

* install gdaltools within dockerfile inorder to support ogr2ogr ([#26](https://github.com/MapColonies/polygon-parts-worker/issues/26)) ([4f48ebc](https://github.com/MapColonies/polygon-parts-worker/commit/4f48ebc0e230de6dfa867c17f4f5e6761c079b27))

## [1.7.0](https://github.com/MapColonies/polygon-parts-worker/compare/v1.6.2...v1.7.0) (2025-03-10)


### Bug Fixes

* get entity name from export job parameters ([8a8fa01](https://github.com/MapColonies/polygon-parts-worker/commit/8a8fa01e39e1aa4bb5ce9d27879bc9e57833dd29))

### [1.6.2](https://github.com/MapColonies/polygon-parts-worker/compare/v1.6.1...v1.6.2) (2025-03-10)


### Bug Fixes

* gpkg location path template ([f1d5523](https://github.com/MapColonies/polygon-parts-worker/commit/f1d55232bc827e8ab62866568c1eb8e259d356eb))

### [1.6.1](https://github.com/MapColonies/polygon-parts-worker/compare/v1.6.0...v1.6.1) (2025-03-09)


### Bug Fixes

* additionalParams fix ([0d6b3ea](https://github.com/MapColonies/polygon-parts-worker/commit/0d6b3ea96220610b99345e213815c790a8facc35))

## [1.6.0](https://github.com/MapColonies/polygon-parts-worker/compare/v1.5.4...v1.6.0) (2025-03-06)


### Features

* added basic export support ([a5914d4](https://github.com/MapColonies/polygon-parts-worker/commit/a5914d4cffc05313a48e2f22bee7f368aa063aac))
* added writing to mount support ([1d5db5d](https://github.com/MapColonies/polygon-parts-worker/commit/1d5db5d1f1fe6cc7de04af7b240d9d1952386b5d))
* update helm and docker ([4bfdd8c](https://github.com/MapColonies/polygon-parts-worker/commit/4bfdd8c0324726ab1595ddd329ecb507197e9e9a))
* use polygonParts find for export ([5e8e888](https://github.com/MapColonies/polygon-parts-worker/commit/5e8e8888d0edc2c3341fce4d11f552b4416c53d4))
* use raster-shared locally ([d7c7b8a](https://github.com/MapColonies/polygon-parts-worker/commit/d7c7b8a0faf568679bd0ff5f8f9f4805b1ec7bc4))


### Bug Fixes

* export job type ([8b4d56d](https://github.com/MapColonies/polygon-parts-worker/commit/8b4d56d404566777c6f88da6e9d6cfa075643d0f))
* interfaces types ([b22bb52](https://github.com/MapColonies/polygon-parts-worker/commit/b22bb52d30b0fb2c2a6d0a968e6b54e5d48de332))
* pr changes ([a0e3499](https://github.com/MapColonies/polygon-parts-worker/commit/a0e34997b451fb1eb17f46d69e87908b202e6bbc))
* tests ([5aa9a0f](https://github.com/MapColonies/polygon-parts-worker/commit/5aa9a0fdbcee4603f1e9e9fbde2c117371866dac))
* tests and raster-shared imports ([45df3d1](https://github.com/MapColonies/polygon-parts-worker/commit/45df3d1dc54ebd9f5282058d4967bfd121e59230))

### [1.5.4](https://github.com/MapColonies/polygon-parts-worker/compare/v1.5.3...v1.5.4) (2025-02-24)


### Bug Fixes

* removing max_old_space_size from Dockerfile ([5e34edc](https://github.com/MapColonies/polygon-parts-worker/commit/5e34edc4b7204a1c031b6c0c6dcf92ecfa98aa03))

### [1.5.3](https://github.com/MapColonies/polygon-parts-worker/compare/v1.5.2...v1.5.3) (2024-12-09)


### Bug Fixes

* helm prometheus annotations indentation ([3b5901c](https://github.com/MapColonies/polygon-parts-worker/commit/3b5901c842969ffe916db4ed1379077d1fe8c8fd))

### [1.5.2](https://github.com/MapColonies/polygon-parts-worker/compare/v1.5.1...v1.5.2) (2024-12-09)


### Bug Fixes

* http config ([aa2cfe3](https://github.com/MapColonies/polygon-parts-worker/commit/aa2cfe3b6b4c72ab6c8ff533d132c2ac9aecdf42))

### [1.5.1](https://github.com/MapColonies/polygon-parts-worker/compare/v1.5.0...v1.5.1) (2024-12-09)


### Bug Fixes

* numeric in config map ([b8fc6f1](https://github.com/MapColonies/polygon-parts-worker/commit/b8fc6f1d26fdea476b19f2cb5d8f73727b30c9eb))

## [1.5.0](https://github.com/MapColonies/polygon-parts-worker/compare/v1.4.1...v1.5.0) (2024-12-09)


### Features

* turn tasks to failed when reached max attempts ([e45c930](https://github.com/MapColonies/polygon-parts-worker/commit/e45c930753fdf2d54f97fb89e9b4f7e6ab0058b0))


### Bug Fixes

* add helm ([c81a427](https://github.com/MapColonies/polygon-parts-worker/commit/c81a42736d5fdf48a7126c7b1d44b3e53a7c26f2))
* add values to global ([186084a](https://github.com/MapColonies/polygon-parts-worker/commit/186084a241d921e72b5f03492fa2158c3e77b65b))
* pr changes ([a6f6291](https://github.com/MapColonies/polygon-parts-worker/commit/a6f6291069ed5295288ecd93f095a97ffd226f56))

### [1.4.1](https://github.com/MapColonies/polygon-parts-worker/compare/v1.4.0...v1.4.1) (2024-12-02)


### Bug Fixes

* jobParams and entityName ([86e751a](https://github.com/MapColonies/polygon-parts-worker/commit/86e751a1e7b423ee6fb8e97cce508eff36d3c0c3))
* pr changes ([9b7ebaa](https://github.com/MapColonies/polygon-parts-worker/commit/9b7ebaadd56d7962900b8c538826627abbed7d7c))
* pr changes ([3137a8b](https://github.com/MapColonies/polygon-parts-worker/commit/3137a8bd5f217eb626c408c6f4dca899e7cd115e))

## [1.4.0](https://github.com/MapColonies/polygon-parts-worker/compare/v1.3.3...v1.4.0) (2024-10-29)


### Features

* upgrade mc models ([9c05286](https://github.com/MapColonies/polygon-parts-worker/commit/9c05286290685f171912aff3aed42a7c7206cb53))

### [1.3.3](https://github.com/MapColonies/polygon-parts-worker/compare/v1.3.2...v1.3.3) (2024-10-22)


### Bug Fixes

* fatal on notify fail ([2eca2fc](https://github.com/MapColonies/polygon-parts-worker/commit/2eca2fcfccb6869f8de10929553b63832c622342))

### [1.3.2](https://github.com/MapColonies/polygon-parts-worker/compare/v1.3.1...v1.3.2) (2024-10-20)

### [1.3.1](https://github.com/MapColonies/polygon-parts-worker/compare/v1.3.0...v1.3.1) (2024-10-20)


### Bug Fixes

* disable postman collenction in workflow ([5dbfa49](https://github.com/MapColonies/polygon-parts-worker/commit/5dbfa49d6ad3177b43a68e11ff681073997392e1))

## [1.3.0](https://github.com/MapColonies/polygon-parts-worker/compare/v1.2.1...v1.3.0) (2024-10-20)


### Features

* implement update ([8d22d10](https://github.com/MapColonies/polygon-parts-worker/commit/8d22d10cf168b52779f68bf3ce5a1c1ce0629a60))
* notify job tracker and ack  on task finish ([117e50a](https://github.com/MapColonies/polygon-parts-worker/commit/117e50a259cfe686bf9284a721876fae4e31a694))


### Bug Fixes

* lint errors ([9f2eb18](https://github.com/MapColonies/polygon-parts-worker/commit/9f2eb189ce0fb9dfc7ebf9d4a961241a445f09b7))
* pr comments ([82971f3](https://github.com/MapColonies/polygon-parts-worker/commit/82971f373e0b649408cbf1f37390cffbe3c430fb))
* revert suggestion, ([bf5e2a5](https://github.com/MapColonies/polygon-parts-worker/commit/bf5e2a5989664642b5a44e9eef254e42362cfc53))
* small bug fixes in update process ([37370bc](https://github.com/MapColonies/polygon-parts-worker/commit/37370bc5da3059b69f59fc73fd5a67de94c4c9b3))

### [1.2.1](https://github.com/MapColonies/polygon-parts-worker/compare/v1.2.0...v1.2.1) (2024-10-10)


### Bug Fixes

* fix helm ([47e519c](https://github.com/MapColonies/polygon-parts-worker/commit/47e519c49827a48dedbd4d47d6b1eb6073d39cf7))
* fix helming by pr ([4f4fd33](https://github.com/MapColonies/polygon-parts-worker/commit/4f4fd336de9db6457b25db1bb4be9e643f380d09))
* github workflows ([fbd7ef6](https://github.com/MapColonies/polygon-parts-worker/commit/fbd7ef6e73176a38f1b0afc7904cd05a9cd7d190))
* pr comments ([a0bc070](https://github.com/MapColonies/polygon-parts-worker/commit/a0bc0702d9b93f3c0f4a0b9c21e269ff91e00c91))
* revert cloudProvider and add jobDefentions tpl ([adc1dfe](https://github.com/MapColonies/polygon-parts-worker/commit/adc1dfed83a0f226bdf3673219228c2dc276e700))
* service.yaml and helpers (in progress) ([3142f13](https://github.com/MapColonies/polygon-parts-worker/commit/3142f1387b964d72cbcdd9956807cf8eba776d21))

### [1.1.5](https://github.com/MapColonies/polygon-parts-worker/compare/v1.1.4...v1.1.5) (2024-10-06)

### [1.1.4](https://github.com/MapColonies/polygon-parts-worker/compare/v1.1.3...v1.1.4) (2024-10-06)

### [1.1.3](https://github.com/MapColonies/polygon-parts-worker/compare/v1.1.2...v1.1.3) (2024-10-06)

### [1.1.2](https://github.com/MapColonies/polygon-parts-worker/compare/v1.1.1...v1.1.2) (2024-10-06)

### [1.1.1](https://github.com/MapColonies/polygon-parts-worker/compare/v1.1.0...v1.1.1) (2024-10-06)

## 1.1.0 (2024-10-06)

## 1.2.0 (2024-10-06)


### Features

* add configurable pooling job types ([609da63](https://github.com/MapColonies/polygon-parts-worker/commit/609da637c2b2f9dfb74ea6d283bd1b4b6b833b29))
* add factory dp structure ([6df878e](https://github.com/MapColonies/polygon-parts-worker/commit/6df878e4a57456a4c40a9a2b1b6d332763a015e1))
* add handler interface and some work ([8597edd](https://github.com/MapColonies/polygon-parts-worker/commit/8597edd3b98fc3a9c88d2d2315af5244395c46a9))
* add mc-model-types ([db8c8b2](https://github.com/MapColonies/polygon-parts-worker/commit/db8c8b2de69ce94726972807ec33a7765096dc82))
* add pooling mechanisem ([e378362](https://github.com/MapColonies/polygon-parts-worker/commit/e37836231dc733fa239afe840f04ff74d772d203))
* add queue client ([9d419db](https://github.com/MapColonies/polygon-parts-worker/commit/9d419dbf7f69f8e7baa9f125878f36e256c8cbfd))
* add reject on jobProcess fail ([d0c7bc2](https://github.com/MapColonies/polygon-parts-worker/commit/d0c7bc290313ab821292afe94617baa106d06a2d))
* add tracing decor ([0d675d1](https://github.com/MapColonies/polygon-parts-worker/commit/0d675d1496d5b0b4345432e6d09bf1367c53a6bf))
* add zod validation ([618f1bb](https://github.com/MapColonies/polygon-parts-worker/commit/618f1bbe4a09594a4d05d35fa9fdaea0f9fd7c17))
* fetch task and its job ([2bc5cae](https://github.com/MapColonies/polygon-parts-worker/commit/2bc5caead474e8f3bae3d27ff90893376028f307))
* finish job handeling process ([ca1d794](https://github.com/MapColonies/polygon-parts-worker/commit/ca1d7942eba53ee780c54c2ae8bce672c05c43d1))
* handlers to container ([f91d175](https://github.com/MapColonies/polygon-parts-worker/commit/f91d1753bd0d97c867670d6eb66fe5306a965a54))
* implement job process and data validation ([5487759](https://github.com/MapColonies/polygon-parts-worker/commit/548775978b078387f5371be0c148c2cbc25fe2ea))
* init pooling loop ([84b78e9](https://github.com/MapColonies/polygon-parts-worker/commit/84b78e940857db645191d9904a6fc5d882eb202d))
* support configurable job types and minor pr comments ([fa622aa](https://github.com/MapColonies/polygon-parts-worker/commit/fa622aa3454c2754f48c7e1ba652d37808e24584))
* support defening new swap and update by env ([a1dc097](https://github.com/MapColonies/polygon-parts-worker/commit/a1dc09770f3a78ec5183e25d92012cb5ae8cede8))
* support defening new swap and update by env ([5ab70e1](https://github.com/MapColonies/polygon-parts-worker/commit/5ab70e1dd6fda8a478a7b050bbb0d5a513746462))
* tracer as readonly ([257453c](https://github.com/MapColonies/polygon-parts-worker/commit/257453c0b8a3fa934fcfbc03f1b1831be6e27985))
* work on jobHandlerFactory ([7bde27e](https://github.com/MapColonies/polygon-parts-worker/commit/7bde27e50ca906a997b8d2f83c4c37d30d747a8a))
* work on queueClient ([c5ffd60](https://github.com/MapColonies/polygon-parts-worker/commit/c5ffd602b326f70d73e06cf35b9f496bc590cdfa))
* work on testing logic ([c0437c9](https://github.com/MapColonies/polygon-parts-worker/commit/c0437c9401d5ad032f340211b608062507218c63))


### Bug Fixes

* fix app configuration ([c326d3a](https://github.com/MapColonies/polygon-parts-worker/commit/c326d3a82e307a39cbefdf2b348e7cf5a887c53c))
* fix conifugration and style ([3120746](https://github.com/MapColonies/polygon-parts-worker/commit/3120746678ecd6e317d0bd20d633abfa44bdf714))
* fix naming of values IPermittedJobTypes ([dfa97bb](https://github.com/MapColonies/polygon-parts-worker/commit/dfa97bb446d82d499aac0218b1e6a15064e76b2e))
* fix nock and test config action order ([5f02554](https://github.com/MapColonies/polygon-parts-worker/commit/5f02554325da72f2acca70e579288aa4625eb6ce))
* fix object sent to zod validation ([5f71cd3](https://github.com/MapColonies/polygon-parts-worker/commit/5f71cd34662d5dbc466791623419603ed97a88b1))
* function types and loop structure ([077e000](https://github.com/MapColonies/polygon-parts-worker/commit/077e000d6d21afe2acc91b5f2e17604c06f8862e))
* github workflows ([e6b720f](https://github.com/MapColonies/polygon-parts-worker/commit/e6b720f7f54af85271ac46332e7152faf8e14fa7))
* newjobproccesor to be injectable ([ef89a69](https://github.com/MapColonies/polygon-parts-worker/commit/ef89a6911a81ed633d3c2d191fdcb8d3a06f58ab))
* typo ([f4099df](https://github.com/MapColonies/polygon-parts-worker/commit/f4099dfb22a0943f03baf88bcb62f700f0d0bab4))

## 1.1.0 (2024-10-06)


### Features

* add configurable pooling job types ([609da63](https://github.com/MapColonies/polygon-parts-worker/commit/609da637c2b2f9dfb74ea6d283bd1b4b6b833b29))
* add factory dp structure ([6df878e](https://github.com/MapColonies/polygon-parts-worker/commit/6df878e4a57456a4c40a9a2b1b6d332763a015e1))
* add handler interface and some work ([8597edd](https://github.com/MapColonies/polygon-parts-worker/commit/8597edd3b98fc3a9c88d2d2315af5244395c46a9))
* add mc-model-types ([db8c8b2](https://github.com/MapColonies/polygon-parts-worker/commit/db8c8b2de69ce94726972807ec33a7765096dc82))
* add pooling mechanisem ([e378362](https://github.com/MapColonies/polygon-parts-worker/commit/e37836231dc733fa239afe840f04ff74d772d203))
* add queue client ([9d419db](https://github.com/MapColonies/polygon-parts-worker/commit/9d419dbf7f69f8e7baa9f125878f36e256c8cbfd))
* add reject on jobProcess fail ([d0c7bc2](https://github.com/MapColonies/polygon-parts-worker/commit/d0c7bc290313ab821292afe94617baa106d06a2d))
* add tracing decor ([0d675d1](https://github.com/MapColonies/polygon-parts-worker/commit/0d675d1496d5b0b4345432e6d09bf1367c53a6bf))
* add zod validation ([618f1bb](https://github.com/MapColonies/polygon-parts-worker/commit/618f1bbe4a09594a4d05d35fa9fdaea0f9fd7c17))
* fetch task and its job ([2bc5cae](https://github.com/MapColonies/polygon-parts-worker/commit/2bc5caead474e8f3bae3d27ff90893376028f307))
* finish job handeling process ([ca1d794](https://github.com/MapColonies/polygon-parts-worker/commit/ca1d7942eba53ee780c54c2ae8bce672c05c43d1))
* handlers to container ([f91d175](https://github.com/MapColonies/polygon-parts-worker/commit/f91d1753bd0d97c867670d6eb66fe5306a965a54))
* implement job process and data validation ([5487759](https://github.com/MapColonies/polygon-parts-worker/commit/548775978b078387f5371be0c148c2cbc25fe2ea))
* init pooling loop ([84b78e9](https://github.com/MapColonies/polygon-parts-worker/commit/84b78e940857db645191d9904a6fc5d882eb202d))
* support configurable job types and minor pr comments ([fa622aa](https://github.com/MapColonies/polygon-parts-worker/commit/fa622aa3454c2754f48c7e1ba652d37808e24584))
* support defening new swap and update by env ([a1dc097](https://github.com/MapColonies/polygon-parts-worker/commit/a1dc09770f3a78ec5183e25d92012cb5ae8cede8))
* support defening new swap and update by env ([5ab70e1](https://github.com/MapColonies/polygon-parts-worker/commit/5ab70e1dd6fda8a478a7b050bbb0d5a513746462))
* tracer as readonly ([257453c](https://github.com/MapColonies/polygon-parts-worker/commit/257453c0b8a3fa934fcfbc03f1b1831be6e27985))
* work on jobHandlerFactory ([7bde27e](https://github.com/MapColonies/polygon-parts-worker/commit/7bde27e50ca906a997b8d2f83c4c37d30d747a8a))
* work on queueClient ([c5ffd60](https://github.com/MapColonies/polygon-parts-worker/commit/c5ffd602b326f70d73e06cf35b9f496bc590cdfa))
* work on testing logic ([c0437c9](https://github.com/MapColonies/polygon-parts-worker/commit/c0437c9401d5ad032f340211b608062507218c63))


### Bug Fixes

* fix app configuration ([c326d3a](https://github.com/MapColonies/polygon-parts-worker/commit/c326d3a82e307a39cbefdf2b348e7cf5a887c53c))
* fix conifugration and style ([3120746](https://github.com/MapColonies/polygon-parts-worker/commit/3120746678ecd6e317d0bd20d633abfa44bdf714))
* fix naming of values IPermittedJobTypes ([dfa97bb](https://github.com/MapColonies/polygon-parts-worker/commit/dfa97bb446d82d499aac0218b1e6a15064e76b2e))
* fix nock and test config action order ([5f02554](https://github.com/MapColonies/polygon-parts-worker/commit/5f02554325da72f2acca70e579288aa4625eb6ce))
* fix object sent to zod validation ([5f71cd3](https://github.com/MapColonies/polygon-parts-worker/commit/5f71cd34662d5dbc466791623419603ed97a88b1))
* function types and loop structure ([077e000](https://github.com/MapColonies/polygon-parts-worker/commit/077e000d6d21afe2acc91b5f2e17604c06f8862e))
* github workflows ([e6b720f](https://github.com/MapColonies/polygon-parts-worker/commit/e6b720f7f54af85271ac46332e7152faf8e14fa7))
* newjobproccesor to be injectable ([ef89a69](https://github.com/MapColonies/polygon-parts-worker/commit/ef89a6911a81ed633d3c2d191fdcb8d3a06f58ab))
* typo ([f4099df](https://github.com/MapColonies/polygon-parts-worker/commit/f4099dfb22a0943f03baf88bcb62f700f0d0bab4))
