# Polygon Parts Worker

----------------------------------

This is a worker service designed to process polygon parts ingestion and export tasks by communicating with the **Job-Manager** service. Using a polling strategy, it processes tasks created by the **Job-Tracker** service.

The service supports **file-based ingestion** from shapefiles with **chunk-based processing** for large capacity datasets, providing scalability and fault tolerance through state management and recovery mechanisms.

### Features:
This project includes the following configurations and tools for efficient development and production:
- **Linting:** Configured with [@map-colonies/eslint-config](https://github.com/MapColonies/eslint-config)

- **Code Formatting:** Set up with [@map-colonies/prettier-config](https://github.com/MapColonies/prettier-config)

- **Testing:** Uses Jest for unit and integration testing

- **Environment Management:** .nvmrc file included for consistent Node versioning

- **Docker Support:** Multi-stage production-ready Dockerfile for efficient builds

- **Commit Standards:** Uses commitlint for consistent commit messages

- **Git Hooks:** Enforced by husky for pre-commit linting and other checks

- **Logging:** Implemented with[@map-colonies/js-logger](https://github.com/MapColonies/js-logger)

- **Configuration Management:** Loads settings with  [node-config](https://www.npmjs.com/package/node-config)

- **Tracing and Metrics:** Provides telemetry with [@map-colonies/telemetry](https://github.com/MapColonies/telemetry)

- **GitHub Templates:** Includes templates for bug reports, feature requests, and pull requests

- **GitHub Actions:** Automated workflows for: 
    - pull request checks
    - LGTM checks
    - Testing
    - Linting
    - Vulnerability scanning with Snyk

## Architecture Overview

### Task Processing Flow

The worker processes two main types of jobs:

1. **Ingestion Jobs** (`Ingestion_New`, `Ingestion_Update`, `Ingestion_Swap_Update`)
   - **Validations Task**: Reads shapefile in chunks, validates features, and sends polygon parts to the Polygon Parts Manager for validation

2. **Export Jobs** (`Export`)
   - **Polygon Parts Task**: Retrieves polygon parts from the Polygon Parts Manager and merges features into GeoPackage files

### Chunk-Based Processing

The service uses **chunk-based processing** for handling large shapefiles:
- Shapefile features are read and validated in configurable chunks (default: 1000 vertices per chunk)
- Processing state is persisted after each chunk for fault tolerance
- Failed tasks can resume from the last processed chunk
- Metrics are collected for each chunk and aggregated at the file level

### State Management and Recovery

- **Processing state** includes last processed chunk index, feature index, and progress percentage
- State is saved to the task parameters after each chunk
- On task retry, processing resumes from the last saved state
- Maximum retry attempts are configurable per task type

## Getting Started
#### Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/en) (version specified in .nvmrc)
- [npm](https://www.npmjs.com/)
- Access to required storage volumes for shapefiles and GeoPackage files

## Installation

Clone the repository and install dependencies:

```bash
git clone https://link-to-project
cd my-project
npm install
```
### Git Hooks Setup
```bash
npx husky install
```
## Configuration
Set up the necessary environment variables by creating a configuration file (`local.json`) in the `config` directory (or modifying `default.json`).

Example structure for config/default.json:


    {
      "telemetry": {
        "logger": {
          "level": "info",
          "prettyPrint": false
        },
        "tracing": {
          "enabled": false,
          "url": "http://localhost:4318/v1/traces"
        },
        "metrics": {
          "enabled": false,
          "url": "http://localhost:4318/v1/metrics",
          "interval": 5,
          "buckets": [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 15, 50, 250, 500]
        }
      },
      "jobManagement": {
        "config": {
          "jobManagerBaseUrl": "http://localhost:8080",
          "heartbeat": {
            "baseUrl": "http://localhost:8083",
            "intervalMs": 3000
          },
          "jobTracker": {
            "baseUrl": "http://localhost:8082"
          },
          "dequeueIntervalMs": 3000
        }
      },
      "polygonPartsManager": {
        "baseUrl": "http://localhost:8081"
      },
      "ingestionSourcesDirPath": "/app/layerSources",
      "gpkgsLocation": "/app/tiles_outputs/gpkgs",
      "server": {
        "port": "8080",
        "request": {
          "payload": {
            "limit": "1mb"
          }
        },
        "response": {
          "compression": {
            "enabled": true,
            "options": null
          }
        }
      },
      "httpRetry": {
        "attempts": 5,
        "delay": "exponential",
        "shouldResetTimeout": true,
        "disableHttpClientLogs": true
      },
      "jobDefinitions": {
        "tasks": {
          "maxAttempts": 3,
          "polygonParts": {
            "type": "polygon-parts"
          },
          "validation": {
            "type": "validation",
            "chunkMaxVertices": 1000
          }
        },
        "jobs": {
          "new": {
            "type": "Ingestion_New"
          },
          "update": {
            "type": "Ingestion_Update"
          },
          "swapUpdate": {
            "type": "Ingestion_Swap_Update"
          },
          "export": {
            "type": "Export"
          }
        }
      }
    }
    
## Supported Environment Variables
| Variable Name                         | Description                                                   | Default Value                                   |
|---------------------------------------|---------------------------------------------------------------|------------------------------------------------|
| `TELEMETRY_SERVICE_NAME`              | Name of the telemetry service.                                | (not set)                                      |
| `TELEMETRY_HOST_NAME`                 | Hostname for the telemetry service.                          | (not set)                                      |
| `TELEMETRY_SERVICE_VERSION`           | Version of the telemetry service.                            | (not set)                                      |
| `LOG_LEVEL`                           | Logging level for the application (e.g., `info`, `debug`, `warn`, `error`, `fatal`).  | info`                |
| `LOG_PRETTY_PRINT_ENABLED`            | Enable or disable pretty printing for logs (boolean).       | `false`                                        |
| `TELEMETRY_TRACING_ENABLED`           | Enable or disable tracing (boolean).                         | `false`                                        |
| `TELEMETRY_TRACING_URL`               | URL for the tracing service.                                 | `http://localhost:4318/v1/traces`             |
| `TELEMETRY_METRICS_ENABLED`           | Enable or disable metrics collection (boolean).              | `false`                                        |
| `TELEMETRY_METRICS_URL`               | URL for the metrics service.                                 | `http://localhost:4318/v1/metrics`            |
| `TELEMETRY_METRICS_INTERVAL`          | Interval (in seconds) for sending metrics data.             | `5`                                            |
| `SERVER_PORT`                         | Port on which the server listens for incoming requests.     | `8080`                                         |
| `REQUEST_PAYLOAD_LIMIT`               | Maximum payload limit for incoming requests.                 | `1mb`                                          |
| `RESPONSE_COMPRESSION_ENABLED`        | Enable or disable response compression (boolean).            | `true`                                         |
| `JOB_MANAGER_BASE_URL`                | Base URL of the Job-Manager service.                         | `http://localhost:8080`                        |
| `HEARTBEAT_BASE_URL`                  | Base URL for the heartbeat service.                          | `http://localhost:8083`                        |
| `HEARTBEAT_INTERVAL_MS`               | Interval (in milliseconds) for heartbeat checks.            | `3000`                                         |
| `JOB_TRACKER_BASE_URL`                | Base URL of the Job Tracker service.                         | `http://localhost:8082`                        |
| `DEQUEUE_INTERVAL_MS`                 | Interval (in milliseconds) for dequeuing jobs.              | `3000`                                         |
| `POLYGON_PARTS_MANAGER_BASE_URL`      | Base URL of the Polygon Parts Manager service.               | `http://localhost:8081`                        |
| `INGESTION_SOURCES_DIR_PATH`          | Base directory path for ingestion source files (shapefiles).  | `/app/layerSources`                            |
| `GPKGS_LOCATION`                      | Directory path for GeoPackage output files.                  | `/app/tiles_outputs/gpkgs`                     |
| `VALIDATION_TASK_TYPE`               | Type for validation tasks.                                   | `validation`                                  |
| `VALIDATIONS_TASK_CHUNK_MAX_VERTICES` | Maximum vertices per chunk for shapefile processing.         | `1000`                                         |
| `POLYGON_PARTS_TASK_TYPE`             | Type for polygon parts tasks.                                | `polygon-parts`                                |
| `INGESTION_NEW_JOB_TYPE`              | Job type for new ingestion jobs.                             | `Ingestion_New`                                |
| `INGESTION_UPDATE_JOB_TYPE`           | Job type for update ingestion jobs.                          | `Ingestion_Update`                             |
| `INGESTION_SWAP_UPDATE_JOB_TYPE`      | Job type for swap update ingestion jobs.                     | `Ingestion_Swap_Update`                        |
| `EXPORT_JOB_TYPE`                     | Job type for export jobs.                                    | `Export`                                       |
| `MAX_TASK_ATTEMPTS`                   | Maximum number of retry attempts for failed tasks.           | `3`                                            |

## Run Locally

Start the service:

```bash
npm run start
```

## Running Tests

You can run tests using the following commands:

**All Tests:** `npm run test`
**Unit Tests Only:** `npm run test:unit`
**Integration Tests Only:** `npm run test:integration`

## Key Features

### Shapefile-Based Ingestion
- Reads shapefile features (.shp, .shx, .dbf, .prj, .cpg files required)
- Validates feature properties against schema
- Supports large shapefiles through chunk-based processing
- Transforms shapefile properties to polygon parts format

### Chunk Processing
- Configurable chunk size based on vertex count (default: 1000 vertices)
- Memory-efficient processing of large datasets
- Progress tracking and state persistence per chunk
- Automatic recovery from failures

### Metrics and Monitoring
- Per-chunk metrics: vertex count, feature count, processing time
- File-level metrics: total chunks, total vertices, total features
- Task-level metrics: success/failure rates, active tasks, processing duration
- Prometheus-compatible metrics endpoint

### Error Handling
- Comprehensive validation of shapefile structure and content
- Graceful handling of invalid features with reporting
- Configurable retry attempts with state recovery
- Detailed error logging for troubleshooting

## Docker

    # Build the Docker image
    docker build -t polygon-parts-worker .
    
    # Run the Docker container with required volume mounts
    docker run -d \
      -p 8080:8080 \
      -v /path/to/ingestion-sources:/app/layerSources \
      -v /path/to/gpkg-outputs:/app/tiles_outputs/gpkgs \
      polygon-parts-worker

### Required Volumes
- **Ingestion Sources**: Mount directory containing shapefile sources
- **GPKG Outputs**: Mount directory for GeoPackage output files

## Monitoring

The service exposes Prometheus-compatible metrics at `/metrics` endpoint when metrics are enabled.

### Available Metrics

#### Task Metrics
- `polygon_parts_active_tasks`: Current number of active tasks
- `polygon_parts_tasks_processed_total`: Total number of tasks processed
- `polygon_parts_tasks_success_total`: Total number of successful tasks
- `polygon_parts_tasks_failure_total`: Total number of failed tasks (labeled by error type)
- `polygon_parts_tasks_processing_duration_seconds`: Task processing duration histogram

#### Shapefile Metrics
- Chunk-level: vertices count, features count per chunk
- File-level: total chunks, total vertices, total features, processing time

See `config/dashboard.json` for a complete Grafana dashboard configuration.
    

## Breaking Changes (v2.0)

This version introduces significant architectural changes:

### Consolidated Job Handlers
- **Removed**: `NewJobHandler` and `UpdateJobHandler` classes
- **Added**: Unified `IngestionJobHandler` that handles all ingestion job types (New, Update, Swap Update)
- All ingestion logic is now centralized for better maintainability

### Shapefile-Based Processing
- **Changed**: Ingestion now requires shapefile inputs instead of inline feature data
- **Required**: Shapefile components (.shp, .shx, .dbf, .prj, .cpg) must all be present
- **New**: Feature properties follow a new schema defined in `shpFile.schema.ts`

### Task Types
- **Added**: New `validation` task type for shapefile validation and processing
- **Changed**: Task processing flow now includes state management and recovery

### Configuration Changes
- **Added**: `INGESTION_SOURCES_DIR_PATH` - base directory for ingestion source files
- **Added**: `VALIDATIONS_TASK_TYPE` - task type for validation tasks
- **Added**: `VALIDATIONS_TASK_CHUNK_MAX_VERTICES` - chunk size configuration
- **Added**: `MAX_TASK_ATTEMPTS` - maximum retry attempts

### Dependencies
- **Added**: `@map-colonies/mc-utils` v3.5.1 - for shapefile processing utilities
- **Added**: `shapefile` - for reading shapefile format
- **Updated**: `@map-colonies/raster-shared` to v7.2.0-alpha.1

## Contributing
We welcome contributions! Please follow these steps:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request
