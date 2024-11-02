import * as Cesium from "cesium";
import { CesiumTerrainProvider, Request, TerrainData, Rectangle } from "cesium";
import * as turf from "@turf/turf";
import { Feature, Polygon } from "geojson";

const MAX_SHORT = 32767;

export interface ModelEdit {
	polygon: Feature<Polygon>;
	polygonTriangles: Feature<Polygon>[]; // TIN algorithm result on polygon
}

export const createModifiableTerrainProvider = (
	terrainProvider: CesiumTerrainProvider,
	modelEdits: ModelEdit[],
) => {
	const originalRequestTileGeometry =
		terrainProvider.requestTileGeometry.bind(terrainProvider);

	terrainProvider.requestTileGeometry = (
		x: number,
		y: number,
		level: number,
		request?: Request,
	) => {
		console.log(x, y, level);
		const promise = originalRequestTileGeometry(x, y, level, request);

		if (!promise || modelEdits.length === 0) {
			return promise;
		}

		const tileRectangle: Rectangle =
			terrainProvider.tilingScheme.tileXYToRectangle(x, y, level);
		const tilePolygon = rectangleToPolygon(tileRectangle); // Create turf polygon from tile rectangle
		const relevantEdits = modelEdits.filter((edit) => {
			return (
				turf.booleanOverlap(edit.polygon, tilePolygon) ||
				turf.booleanContains(edit.polygon, tilePolygon)
			);
		});
		if (relevantEdits.length === 0) {
			return promise;
		}

		console.log(x, y, level);

		return promise.then((data: TerrainData) =>
			modifyTerrainTile(data, tileRectangle, relevantEdits),
		);
	};

	const modifyTerrainTile = (
		terrainData: TerrainData,
		tileRectangle: Rectangle,
		modelEdits: ModelEdit[],
	) => {
		const data = terrainData as any;
		const minimumHeight = data._minimumHeight;
		const maximumHeight = data._maximumHeight;

		const quantizedVertices: Uint16Array = data._quantizedVertices;
		const vertexCount = quantizedVertices.length / 3;

		const positions: number[][] = [];
		for (let i = 0; i < vertexCount; i++) {
			const rawU = quantizedVertices[i];
			const rawV = quantizedVertices[i + vertexCount];
			const rawH = quantizedVertices[i + vertexCount * 2];

			const u = rawU / MAX_SHORT;
			const v = rawV / MAX_SHORT;
			const longitude = Cesium.Math.toDegrees(
				Cesium.Math.lerp(tileRectangle.west, tileRectangle.east, u),
			);
			const latitude = Cesium.Math.toDegrees(
				Cesium.Math.lerp(tileRectangle.south, tileRectangle.north, v),
			);

			let height = Cesium.Math.lerp(
				minimumHeight,
				maximumHeight,
				rawH / MAX_SHORT,
			);
			const currentPoint = turf.point([longitude, latitude]);
			const relevantEdit = modelEdits.find((edit) =>
				turf.booleanPointInPolygon(currentPoint, edit.polygon),
			);
			if (relevantEdit) {
				const relevantTriangle = relevantEdit.polygonTriangles.find(
					(triangle) =>
						turf.booleanPointInPolygon(currentPoint, triangle),
				);
				if (relevantTriangle) {
					height = turf.planepoint(currentPoint, relevantTriangle);
				}
			}
			positions.push([longitude, latitude, height]);
		}

		const heights = positions.map((p) => p[2]);
		const newMinHeight = Math.min(...heights);
		const newMaxHeight = Math.max(...heights);

		const newQuantizedVertices = new Uint16Array(positions.length * 3);
		positions.forEach((p, i) => {
			const lonRad = Cesium.Math.toRadians(p[0]);
			newQuantizedVertices[i] = Math.round(
				Cesium.Math.lerp(
					MAX_SHORT,
					0,
					(lonRad - tileRectangle.east) /
						(tileRectangle.west - tileRectangle.east),
				),
			);

			const latRad = Cesium.Math.toRadians(p[1]);
			newQuantizedVertices[i + positions.length] = Math.round(
				Cesium.Math.lerp(
					MAX_SHORT,
					0,
					(latRad - tileRectangle.north) /
						(tileRectangle.south - tileRectangle.north),
				),
			);

			const relativeHeight = Math.round(
				Cesium.Math.lerp(
					0,
					MAX_SHORT,
					(p[2] - newMinHeight) / (newMaxHeight - newMinHeight),
				),
			);
			newQuantizedVertices[i + positions.length * 2] = relativeHeight;
		});

		data._minimumHeight = newMinHeight;
		data._maximumHeight = newMaxHeight;
		data._quantizedVertices = newQuantizedVertices;

		return data as TerrainData;
	};

	const rectangleToPolygon = (rectangle: Rectangle) => {
		const east = Cesium.Math.toDegrees(rectangle.east);
		const west = Cesium.Math.toDegrees(rectangle.west);
		const south = Cesium.Math.toDegrees(rectangle.south);
		const north = Cesium.Math.toDegrees(rectangle.north);

		const coordinates = [
			[west, south],
			[west, north],
			[east, north],
			[east, south],
			[west, south],
		];

		const polygon = turf.polygon([coordinates]);

		return polygon;
	};

	return terrainProvider;
};
