import { CesiumTerrainProvider, createWorldTerrainAsync } from "cesium";
import { Viewer } from "resium";
import { createModifiableTerrainProvider } from "../../modules/ModifiableTerrainProvider";
import * as turf from "@turf/turf";
import { useEffect, useState } from "react";

const modelEdits = [
	{
		polygon: turf.polygon([
			[
				[124.0, 33.0],
				[124.0, 38.0],
				[130.0, 38.0],
				[130.0, 33.0],
				[124.0, 33.0],
			],
		]),
		polygonTriangles: [],
	},
];

const CesiumPage = () => {
	const [terrainProvider, setTerrainProvider] =
		useState<CesiumTerrainProvider>();

	useEffect(() => {
		const initailize = async () => {
			const defaultTerrainProvider = await createWorldTerrainAsync();
			setTerrainProvider(
				createModifiableTerrainProvider(
					defaultTerrainProvider,
					modelEdits,
				),
			);
		};

		initailize();
	}, []);

	console.log(terrainProvider);

	return (
		<div className="h-[100vh]">
			{terrainProvider && (
				<Viewer
					className="size-full"
					terrainProvider={terrainProvider}
					animation={false}
					timeline={false}
				></Viewer>
			)}
		</div>
	);
};

export default CesiumPage;
