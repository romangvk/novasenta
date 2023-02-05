import data from "./data/sample-test.json";
import { faker } from "@faker-js/faker";
import React, { useRef, useState, useEffect } from "react";
import * as d3 from "d3";

// The domain of the x axis
const minX = data.xumap.reduce((min, cur) => Math.min(min, cur), data.xumap[0]);
const maxX = data.xumap.reduce((max, cur) => Math.max(max, cur), data.xumap[0]);

// The domain of the y axis
const minY = data.yumap.reduce((min, cur) => Math.min(min, cur), data.yumap[0]);
const maxY = data.yumap.reduce((max, cur) => Math.max(max, cur), data.yumap[0]);

// RGB color codes gen
const cellColors = new Map<string, string>();
for (const celltype of data.celltypes)
  if (celltype !== "Total") cellColors.set(celltype, faker.color.rgb());

const minZoom = 0.5;
const maxZoom = 100;

function App() {
  // svgRef is the reference to the container
  const svgRef = useRef(null);

  // Zoom controller
  const zoomRef: { current: d3.ZoomBehavior<Element, unknown> | null } =
    useRef(null);

  // K is the current scale factor.
  const [k, setK] = useState(1);

  // Calculates the value of a property for semantic transform based on the current scale factor.
  const transformFunc = (dimension: number) => {
    return k < maxZoom * 0.75 ? dimension / k : dimension / (maxZoom * 0.75);
  };

  // This sets up all d3 zoom and pan functions.
  useEffect(() => {
    if (svgRef.current) {
      // Get reference to SVGElement
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svg: d3.Selection<Element, unknown, any, any> = d3.select(
        svgRef.current
      );

      // Set the zoom/pan behavior
      zoomRef.current = d3
        .zoom()
        .scaleExtent([minZoom, maxZoom])
        .on("zoom", (evt: { transform: { k: number } }) => {
          svg.select("g").attr("transform", evt.transform.toString());
          setK(evt.transform.k);
        });
      // Apply the zoom to svgRef
      svg.call(zoomRef.current);
    }
  }, []);

  // Calling this resets to zoom to bring the whole plot back into view
  const resetZoom = () => {
    if (zoomRef.current && svgRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const svg: d3.Selection<Element, unknown, any, any> = d3.select(
        svgRef.current
      );
      svg
        .transition()
        .duration(250)
        .call(zoomRef.current.transform, d3.zoomIdentity.scale(0.8));
    }
  };

  // Unit is a sizing unit scaled by the current zoom level
  const unit = transformFunc((maxY - minY) / 250);

  return (
    <div className="container">
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        transform="scale(1,-1)"
        height="100vh"
        width="100vw"
        ref={svgRef}
      >
        <g>
          {data.cellid.map((_, i) => (
            <Point i={i} unit={unit} />
          ))}
          <path
            d={`M${minX} ${maxY} L${minX} ${minY}  L${maxX} ${minY}`}
            stroke="black"
            strokeWidth={unit / 2}
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d={`M${minX} ${maxY + unit} L${minX - unit / 2} ${maxY} L${
              minX + unit / 2
            } ${maxY} L${minX} ${maxY + unit}`}
            stroke="black"
            fill="black"
            strokeWidth={unit / 2}
            strokeLinejoin="round"
          />
          <path
            d={`M${maxX + unit} ${minY} L${maxX} ${minY - unit / 2} L${maxX} ${
              minY + unit / 2
            } L${maxX + unit} ${minY}`}
            stroke="black"
            fill="black"
            strokeWidth={unit / 2}
            strokeLinejoin="round"
          />
          <g transform={`translate(${minX - unit * 10}, ${minY - unit * 5})`}>
            <text transform={`scale(${unit / 4}, ${-unit / 4})`} x="0" y="0">
              <tspan x="0">x={minX}</tspan>
              <tspan x="0" dy="1.2em">
                y={minY}
              </tspan>
            </text>
          </g>
          <g transform={`translate(${minX - unit * 10}, ${maxY + unit * 5})`}>
            <text transform={`scale(${unit / 4}, ${-unit / 4})`} x="0" y="0">
              <tspan x="0">y={maxY}</tspan>
            </text>
          </g>
          <g transform={`translate(${maxX - unit * 10}, ${minY - unit * 5})`}>
            <text transform={`scale(${unit / 4}, ${-unit / 4})`} x="0" y="0">
              <tspan x="0">x={maxX}</tspan>
            </text>
          </g>
        </g>
      </svg>
      <div
        className="panel"
        style={{
          bottom: 10,
          right: 10,
        }}
        onClick={resetZoom}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1em 1fr repeat(2, 4em)",
            gap: "1em",
          }}
        >
          <span />
          <span>Type</span>
          <span>Count</span>
          <span>Percent</span>
          {data.celltypes.map((type, i) => (
            <React.Fragment key={type}>
              <span
                style={{ background: cellColors.get(type), opacity: 0.8 }}
              />
              <span>{type}</span>
              <span>{data.celltypenums[i]}</span>
              <span>
                {Math.round(data.celltypepercents[i] * 100000) / 1000}%
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>
      <div
        className="panel"
        style={{
          top: 10,
          left: 10,
        }}
        onClick={resetZoom}
      >
        Reset Zoom
      </div>
    </div>
  );
}

export default App;

interface PointProps {
  /**
   * This is the index of the datapoint in the data arrays.
   */
  i: number;
  /**
   * This is a scaled unit to determine how large to draw the point.
   */
  unit: number;
}

const Point = ({ i, unit }: PointProps) => {
  // return nothing if the index doesn't exist
  if (i < 0 || i >= data.cellid.length) return null;
  const [x, y, cellid, celltype] = [
    data.xumap[i],
    data.yumap[i],
    data.cellid[i],
    data.celltype[i],
  ];

  const [tooltip, setTooltip] = useState(false);

  return (
    <React.Fragment key={cellid}>
      <circle
        id={cellid}
        cx={x}
        cy={y}
        r={tooltip ? unit * 2 : unit}
        fill={cellColors.get(celltype) ?? "black"}
        fillOpacity={0.8}
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
      />
      {tooltip && (
        <g transform={`translate(${x + unit * 2}, ${y})`}>
          <text transform={`scale(${unit / 4}, ${-unit / 4})`} x="0" y="0">
            <tspan x="0">{cellid}</tspan>
            <tspan x="0" dy="1.2em">
              {celltype}
            </tspan>
          </text>
        </g>
      )}
    </React.Fragment>
  );
};
