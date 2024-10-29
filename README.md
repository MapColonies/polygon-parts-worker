# Polygon Parts Worker

----------------------------------

This is a worker service designed to handle polygon parts tasks by communicating with the **Job-Manager** service. Using a polling strategy, it processes tasks created by the **Job-Tracker** service.

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

## Getting Started
#### Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/en) (version specified in .nvmrc)
- [npm](https://www.npmjs.com/)

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
          "jobManagerBaseUrl": "http://http://localhost:8080",
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
          "polygonParts": {
            "type": "polygon-parts"
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
          }
        }
      }
    }
    
## Supported Environment Variables
| Variable Name                         | Description                                                   |
|---------------------------------------|---------------------------------------------------------------|
| `TELEMETRY_SERVICE_NAME`              | Service name for telemetry use
| `TELEMETRY_HOST_NAME`                 | Url for the telemetry service.                          |
| `TELEMETRY_SERVICE_VERSION`           | Version of the telemetry service.                            |
| `LOG_LEVEL`                           | Logging level for the application (e.g., `info`, `debug`).  |
| `LOG_PRETTY_PRINT_ENABLED`            | Enable or disable pretty printing for logs (boolean).       |
| `TELEMETRY_TRACING_ENABLED`           | Enable or disable tracing (boolean).                         |
| `TELEMETRY_TRACING_URL`               | URL for the tracing service.                                 |
| `TELEMETRY_METRICS_ENABLED`           | Enable or disable metrics collection (boolean).              |
| `TELEMETRY_METRICS_URL`               | URL for the metrics service.                                 |
| `TELEMETRY_METRICS_INTERVAL`          | Interval (in milliseconds) for sending metrics data.        |
| `SERVER_PORT`                         | Port on which the server listens for incoming requests.     |
| `REQUEST_PAYLOAD_LIMIT`               | Maximum payload limit for incoming requests.                 |
| `RESPONSE_COMPRESSION_ENABLED`        | Enable or disable response compression (boolean).            |
| `JOB_MANAGER_BASE_URL`                | Base URL of the Job-Manager service.                         |
| `HEARTBEAT_BASE_URL`                  | Base URL for the heartbeat service.                          |
| `HEARTBEAT_INTERVAL_MS`               | Interval (in milliseconds) for heartbeat checks.            |
| `JOB_TRACKER_BASE_URL`                | Base URL of the Job Tracker service.                         |
| `DEQUEUE_INTERVAL_MS`                 | Interval (in milliseconds) for dequeuing jobs.              |
| `POLYGON_PARTS_MANAGER_BASE_URL`      | Base URL of the Polygon Parts Manager service.               |
| `POLYGON_PARTS_TASK_TYPE`             | Type for polygon parts tasks.                                |
| `INGESTION_NEW_JOB_TYPE`              | Job type for new ingestion jobs.                             |
| `INGESTION_UPDATE_JOB_TYPE`           | Job type for update ingestion jobs.                          |
| `INGESTION_SWAP_UPDATE_JOB_TYPE`      | Job type for swap update ingestion jobs.                     |

## Run Locally

Start the service:

```bash
npm run start
```

## Running Tests

You can run tests using the following commands:

**All Tests:** `npm run test`
**Unit Tests Only:** `npm run test:unit`

## Docker

    # Build the Docker image
    docker build -t polygon-parts-worker .
    
    # Run the Docker container
    docker run -d -p 3000:3000 polygon-parts-worker
    

## Contributing
We welcome contributions! Please follow these steps:

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request
