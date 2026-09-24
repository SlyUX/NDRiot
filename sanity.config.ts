"use client";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";
import { ResendCreatorLiveAction } from "./src/sanity/actions/resend-notification";
import { PreviewNoiseAction } from "./src/sanity/actions/preview-noise";
import { SendNoiseAction } from "./src/sanity/actions/send-noise";
import { projectId, dataset, apiVersion } from "./src/sanity/env";

/** Types that must only ever have one document. See src/sanity/structure.ts. */
const SINGLETONS = ["siteSettings"];

export default defineConfig({
  basePath: "/studio",
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({ structure }),
    visionTool({ defaultApiVersion: apiVersion }),
  ],
  document: {
    // Hides singletons from the global "create new" menu. The structure pins
    // the document ID; this stops a second one being made from the + button.
    newDocumentOptions: (prev, { creationContext }) =>
      creationContext.type === "global"
        ? prev.filter((template) => !SINGLETONS.includes(template.templateId))
        : prev,
    // Per-type admin actions: "Resend notification" on creators, "Preview this
    // draft" on ND Noise issues.
    actions: (prev, { schemaType }) => {
      if (schemaType === "creator") return [...prev, ResendCreatorLiveAction];
      if (schemaType === "noiseIssue")
        return [...prev, PreviewNoiseAction, SendNoiseAction];
      return prev;
    },
  },
});
