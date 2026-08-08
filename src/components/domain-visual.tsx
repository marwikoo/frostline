"use client";

import { scaleLinear, ticks } from "d3";
import { Snowflake, Thermometer } from "lucide-react";
import type { FrostlineShipment } from "@/lib/types";

const formatTemperature = (value: number) => `${(value / 1000).toFixed(1)} C`;

export function TemperatureEnvelope({
  shipment,
}: {
  shipment?: FrostlineShipment;
}) {
  if (!shipment) {
    return (
      <div className="temperature-empty" data-resource="d3">
        <Snowflake size={28} />
        <strong>No lot selected</strong>
        <span>Select an onchain shipment to inspect its declared envelope.</span>
      </div>
    );
  }

  const sensor = shipment.evidence?.find(
    (item) => item.type === "sensor_manifest",
  );
  const observedMin = Number(
    sensor?.facts?.declared_min_milli_c ?? shipment.min_temp_milli_c,
  );
  const observedMax = Number(
    sensor?.facts?.declared_max_milli_c ?? shipment.max_temp_milli_c,
  );
  const low = Math.min(shipment.min_temp_milli_c, observedMin) - 3000;
  const high = Math.max(shipment.max_temp_milli_c, observedMax) + 3000;
  const x = scaleLinear().domain([low, high]).range([76, 946]);
  const axisTicks = ticks(low, high, 8);
  const targetX = x(shipment.min_temp_milli_c);
  const targetWidth = x(shipment.max_temp_milli_c) - targetX;

  return (
    <div className="temperature-envelope" data-resource="d3">
      <div className="temperature-title">
        <div>
          <span>Declared release envelope</span>
          <strong>{shipment.batch_code}</strong>
        </div>
        <div className="temperature-values">
          <span>
            Target
            <strong>
              {formatTemperature(shipment.min_temp_milli_c)} to{" "}
              {formatTemperature(shipment.max_temp_milli_c)}
            </strong>
          </span>
          <span>
            Sensor claim
            <strong>
              {formatTemperature(observedMin)} to{" "}
              {formatTemperature(observedMax)}
            </strong>
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 1000 228"
        role="img"
        aria-label={`Temperature release envelope for ${shipment.batch_code}`}
      >
        <line x1="76" x2="946" y1="126" y2="126" className="axis-line" />
        {axisTicks.map((value) => (
          <g key={value}>
            <line
              x1={x(value)}
              x2={x(value)}
              y1="112"
              y2="142"
              className="axis-tick"
            />
            <text x={x(value)} y="166" textAnchor="middle">
              {(value / 1000).toFixed(0)}
            </text>
          </g>
        ))}
        <rect
          x={targetX}
          y="92"
          width={targetWidth}
          height="68"
          className="target-band"
        />
        <line
          x1={x(observedMin)}
          x2={x(observedMax)}
          y1="76"
          y2="76"
          className="sensor-span"
        />
        <circle cx={x(observedMin)} cy="76" r="7" className="sensor-marker" />
        <circle cx={x(observedMax)} cy="76" r="7" className="sensor-marker" />
        <text x="76" y="206" className="axis-unit">
          milli-Celsius normalized to degrees C
        </text>
      </svg>
      <div className="sensor-array" aria-hidden="true">
        {Array.from({ length: 36 }, (_, index) => (
          <i
            key={index}
            className={
              index === 8 || index === 27
                ? "warning"
                : index % 5 === 0
                  ? "cold"
                  : ""
            }
          />
        ))}
        <span>36 SENSOR CHANNELS / D3 NORMALIZED RANGE</span>
      </div>
      <div className="temperature-legend">
        <span>
          <i className="legend-band" />
          Contract envelope
        </span>
        <span>
          <i className="legend-sensor" />
          Manifest extrema
        </span>
        <span>
          <Thermometer size={14} />
          {sensor
            ? `${sensor.facts.sample_count ?? 0} samples declared`
            : "Manifest details pending"}
        </span>
      </div>
    </div>
  );
}
