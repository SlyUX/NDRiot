"use client";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";
import { submissionStructure } from "./src/sanity/submission-structure";
import { ResendCreatorLiveAction } from "./src/sanity/actions/resend-notification";
import { PreviewNoiseAction } from "./src/sanity/actions/preview-noise";
import { SendNoiseAction } from "./src/sanity/actions/send-noise";
import {
  AcceptRagAction,
  ResubmitRagAction,
  DeclineRagAction,
} from "./src/sanity/actions/rag-decision";
import { metricsTool } from "./src/sanity/tools/metrics";
import { projectId, dataset, apiVersion } from "./src/sanity/env";

/** Types that must only ever have one document. See src/sanity/structure.ts. */
const SINGLETONS = ["siteSettings"];
/** Submissions live in their own workspace; never created in production. */
const PRODUCTION_HIDDEN = [...SINGLETONS, "ragSubmission"];

/** The private dataset holding Rag submissions (same default as the server clients). */
const SUBMISSIONS_DATASET =
  process.env.NEXT_PUBLIC_SANITY_OWNERSHIP_DATASET ?? "ndriot_auth";

/**
 * Two workspaces (a switcher appears in /studio):
 *  - "production" — all site content, on the public `production` dataset.
 *  - "submissions" — Rag submissions only, on the private `ndriot_auth` dataset,
 *    where Joe/Stephen review them and send Accept/Resubmit/Decline replies.
 *
 * Each workspace needs its own non-overlapping basePath, so production moves from
 * /studio to /studio/production; /studio itself now shows the workspace picker.
 */
export default defineConfig([
  {
    name: "production",
    title: "ND Riot",
    basePath: "/studio/production",
    projectId,
    dataset,
    schema: { types: schemaTypes },
    plugins: [
      structureTool({ structure }),
      visionTool({ defaultApiVersion: apiVersion }),
    ],
    // Adds a top-level "Metrics" tab (userbase + content counts).
    tools: (prev) => [...prev, metricsTool],
    document: {
      // Hides singletons (and the submission type) from the global "create new"
      // menu. The structure pins singleton IDs; this stops extras being made.
      newDocumentOptions: (prev, { creationContext }) =>
        creationContext.type === "global"
          ? prev.filter(
              (template) => !PRODUCTION_HIDDEN.includes(template.templateId),
            )
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
  },
  {
    name: "submissions",
    title: "Rag Submissions",
    basePath: "/studio/submissions",
    projectId,
    dataset: SUBMISSIONS_DATASET,
    schema: { types: schemaTypes },
    plugins: [structureTool({ structure: submissionStructure })],
    document: {
      // Submissions arrive via the on-site form — nothing is hand-created here.
      newDocumentOptions: () => [],
      actions: (prev, { schemaType }) => {
        if (schemaType === "ragSubmission")
          return [...prev, AcceptRagAction, ResubmitRagAction, DeclineRagAction];
        return prev;
      },
    },
  },
]);
