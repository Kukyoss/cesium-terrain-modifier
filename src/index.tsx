import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import * as Cesium from "cesium";

Cesium.Ion.defaultAccessToken = String(
	process.env.REACT_APP_CESIUM_ION_ACCESS_TOKEN,
);

const root = ReactDOM.createRoot(
	document.getElementById("root") as HTMLElement,
);
root.render(<App />);
