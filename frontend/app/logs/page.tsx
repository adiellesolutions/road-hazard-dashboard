"use client";

import {
  useEffect,
  useState,
} from "react";

import PageHeader from "@/components/PageHeader";

import {
  getDetections,
  getExportUrl,
  getTrials,
} from "@/lib/api";

import {
  Detection,
  HazardType,
  TestSession,
} from "@/types/detection";


const HAZARD_TYPES:
  HazardType[] = [

  "Alligator Cracking",
  "Bleeding",
  "Block Cracking",
  "Corrugation and Shoving",
  "Depression",
  "Joint Reflection Cracking",
  "Longitudinal Cracking",
  "Patching",
  "Potholes",
  "Raveling",
  "Rutting",
  "Slippage Cracking",
  "Stripping",
  "Transverse Cracking",
];


export default function DetectionLogsPage() {

  const [
    logs,
    setLogs,
  ] = useState<Detection[]>([]);


  const [
    trials,
    setTrials,
  ] = useState<TestSession[]>([]);


  const [
    hazardFilter,
    setHazardFilter,
  ] = useState("all");


  const [
    trialFilter,
    setTrialFilter,
  ] = useState("all");


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    selectedImage,
    setSelectedImage,
  ] = useState<string | null>(
    null
  );


  useEffect(() => {

    getTrials()
      .then(
        setTrials
      )
      .catch(
        console.error
      );

  }, []);


  useEffect(() => {

    setLoading(true);

    getDetections(
      1000,
      trialFilter,
      hazardFilter
    )
      .then(
        setLogs
      )
      .catch((error) => {

        console.error(
          error
        );

        setLogs([]);

      })
      .finally(
        () =>
          setLoading(false)
      );

  }, [
    trialFilter,
    hazardFilter,
  ]);


  return (

    <div>

      <PageHeader
        eyebrow="History"
        title="Detection Logs"
        description="Every hazard recorded by the system, newest first."
      />


      <div
        className="
          flex
          flex-col
          lg:flex-row
          lg:items-center
          justify-between
          gap-3
          mb-4
        "
      >

        <div
          className="
            flex
            flex-col
            sm:flex-row
            gap-3
          "
        >

          <select
            value={
              hazardFilter
            }
            onChange={
              (event) =>
                setHazardFilter(
                  event.target.value
                )
            }
            className="
              bg-base-surface
              border
              border-base-border
              rounded-lg
              px-3
              py-2
              text-sm
              text-text-primary
              font-mono
            "
          >

            <option value="all">
              All Hazard Types
            </option>

            {HAZARD_TYPES.map(
              (hazard) => (

                <option
                  key={
                    hazard
                  }
                  value={
                    hazard
                  }
                >
                  {hazard}
                </option>

              )
            )}

          </select>


          <select
            value={
              trialFilter
            }
            onChange={
              (event) =>
                setTrialFilter(
                  event.target.value
                )
            }
            className="
              bg-base-surface
              border
              border-base-border
              rounded-lg
              px-3
              py-2
              text-sm
              text-text-primary
              font-mono
            "
          >

            <option value="all">
              All Trials
            </option>

            {trials.map(
              (trial) => (

                <option
                  key={
                    trial.id
                  }
                  value={
                    trial.id
                  }
                >
                  Trial {
                    trial.trial_number
                  }
                </option>

              )
            )}

          </select>

        </div>


        <a
          href={
            getExportUrl(
              trialFilter
            )
          }
          className="
            inline-flex
            items-center
            justify-center
            bg-accent
            hover:bg-accent-dim
            transition-colors
            text-white
            text-sm
            font-medium
            px-4
            py-2
            rounded-lg
          "
        >
          Export CSV
        </a>

      </div>


      <div
        className="
          bg-base-surface
          border
          border-base-border
          rounded-lg
          overflow-x-auto
        "
      >

        <table
          className="
            w-full
            text-sm
          "
        >

          <thead>

            <tr
              className="
                border-b
                border-base-border
                text-left
              "
            >

              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Image
              </th>

              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Trial
              </th>

              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Hazard Type
              </th>

              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Latitude
              </th>

              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Longitude
              </th>

              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Time
              </th>

            </tr>

          </thead>


          <tbody
            className="
              divide-y
              divide-base-border
            "
          >

            {loading && (

              <tr>

                <td
                  colSpan={6}
                  className="
                    text-center
                    text-text-muted
                    py-8
                  "
                >
                  Loading…
                </td>

              </tr>

            )}


            {!loading &&
              logs.length === 0 && (

              <tr>

                <td
                  colSpan={6}
                  className="
                    text-center
                    text-text-muted
                    py-8
                  "
                >
                  No detections found.
                </td>

              </tr>

            )}


            {logs.map(
              (log) => (

                <tr
                  key={
                    log.id
                  }
                  className="
                    hover:bg-base-surface2
                  "
                >

                  <td
                    className="
                      px-5
                      py-3
                    "
                  >

                    {log.image_url ? (

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImage(
                            log.image_url
                          )
                        }
                        className="
                          block
                          rounded-md
                          overflow-hidden
                          border
                          border-base-border
                          hover:border-accent-cyan
                          transition-colors
                        "
                      >

                        <img
                          src={
                            log.image_url
                          }
                          alt={
                            `${log.hazard_type} detection`
                          }
                          className="
                            w-20
                            h-14
                            object-cover
                          "
                        />

                      </button>

                    ) : (

                      <div
                        className="
                          w-20
                          h-14
                          rounded-md
                          border
                          border-base-border
                          flex
                          items-center
                          justify-center
                          text-text-faint
                          text-[10px]
                          font-mono
                        "
                      >
                        No image
                      </div>

                    )}

                  </td>


                  <td
                    className="
                      px-5
                      py-3
                      font-mono
                      text-accent-cyan
                    "
                  >
                    {
                      log.test_sessions
                        ? `Trial ${log.test_sessions.trial_number}`
                        : "Unassigned"
                    }
                  </td>


                  <td
                    className="
                      px-5
                      py-3
                      text-text-primary
                    "
                  >
                    {
                      log.hazard_type
                    }
                  </td>


                  <td
                    className="
                      px-5
                      py-3
                      font-mono
                      text-text-muted
                    "
                  >
                    {
                      log.latitude
                        ?.toFixed(5)
                        ?? "—"
                    }
                  </td>


                  <td
                    className="
                      px-5
                      py-3
                      font-mono
                      text-text-muted
                    "
                  >
                    {
                      log.longitude
                        ?.toFixed(5)
                        ?? "—"
                    }
                  </td>


                  <td
                    className="
                      px-5
                      py-3
                      font-mono
                      text-text-muted
                    "
                  >
                    {
                      new Date(
                        log.created_at
                      ).toLocaleString()
                    }
                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>


      {/* =====================================================
          IMAGE PREVIEW MODAL
      ====================================================== */}

      {selectedImage && (

        <div
          className="
            fixed
            inset-0
            z-[9999]
            bg-black/80
            flex
            items-center
            justify-center
            p-4
          "
          onClick={() =>
            setSelectedImage(
              null
            )
          }
        >

          <div
            className="
              relative
              max-w-5xl
              w-full
            "
            onClick={
              (event) =>
                event.stopPropagation()
            }
          >

            <button
              type="button"
              onClick={() =>
                setSelectedImage(
                  null
                )
              }
              className="
                absolute
                -top-10
                right-0
                text-white
                text-sm
                font-medium
              "
            >
              Close ✕
            </button>


            <img
              src={
                selectedImage
              }
              alt="Road hazard detection"
              className="
                w-full
                max-h-[85vh]
                object-contain
                rounded-lg
                bg-black
              "
            />

          </div>

        </div>

      )}

    </div>

  );

}