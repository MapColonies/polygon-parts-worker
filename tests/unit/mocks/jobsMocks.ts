/* eslint-disable @typescript-eslint/no-magic-numbers */
import { PolygonPartsPayload, ProductType } from "@map-colonies/mc-model-types";

export const newPolyPartsJobMock: PolygonPartsPayload = {
    productId: "BlueMarble",
    productType: "Orthophoto" as ProductType,
    catalogId: "c52d8189-7e07-456a-8c6b-53859523c3e9",
    productVersion: "268.4",
    partsData: [
        {
            sourceId: "string",
            sourceName: "string",
            imagingTimeBeginUTC: "2024-09-23T20:24:04.269Z" as unknown as Date,
            imagingTimeEndUTC: "2024-09-23T20:24:04.269Z" as unknown as Date,
            resolutionDegree: 0.703125,
            resolutionMeter: 78271.52,
            sourceResolutionMeter: 78271.52,
            horizontalAccuracyCE90: 4000,
            sensors: [
                "string"
            ],
            countries: [
                "string"
            ],
            cities: [
                "string"
            ],
            description: "string",
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [
                            180,
                            180
                        ]
                    ]
                ]
            }
        }
    ]
}
