import React from "react";
import "./VerticalStepper.css";

const steps = [
  { label: "Upload" },
  { label: "Configure" },
  { label: "Generate" },
];

function VerticalStepper({ activeStep = 0 }) {
  return (
    <div className="vertical-stepper">
      {steps.map((step, idx) => (
        <div className="stepper-step" key={idx}>
          <div
            className={`stepper-circle${idx === activeStep ? " active" : ""}`}
          >
            {idx + 1}
          </div>
          {idx < steps.length - 1 && <div className="stepper-line" />}

        </div>
      ))}
    </div>
  );
}

export default VerticalStepper;
