"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import dynamic from "next/dynamic";

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


const HazardMap =
  dynamic(
    () =>
      import(
        "@/components/HazardMap"
      ),
    {
      ssr: false,

      loading: () => (

        <div
          className="
            min-h-[400px]
            w-full
            flex
            items-center
            justify-center
            text-text-faint
            font-mono
            text-sm
          "
        >
          Loading map…
        </div>

      ),
    }
  );


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const STORAGE_BUCKET = "hazard-images";


/* =========================================================
   HAZARD TYPES
========================================================= */

const HAZARD_TYPES: HazardType[] = [
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


/* =========================================================
   TYPES
========================================================= */

type EditableDetection = Detection & {
  confidence?: number | null;
  trial_id?: string | null;
};

type DetectionForm = {
  trialId: string;
  hazardType: string;
  confidence: string;
  latitude: string;
  longitude: string;
  createdAt: string;
  imageUrl: string;
};


/* =========================================================
   INITIAL FORM
========================================================= */

const EMPTY_FORM: DetectionForm = {
  trialId: "",
  hazardType: "Potholes",
  confidence: "",
  latitude: "",
  longitude: "",
  createdAt: "",
  imageUrl: "",
};


/* =========================================================
   HELPERS
========================================================= */

function getSupabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}


function toDateTimeLocal(
  dateValue?: string | null
) {
  if (!dateValue) return "";

  const date =
    new Date(dateValue);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const offset =
    date.getTimezoneOffset();

  const localDate =
    new Date(
      date.getTime() -
        offset * 60 * 1000
    );

  return localDate
    .toISOString()
    .slice(0, 16);
}


function parseNullableNumber(
  value: string
) {
  if (
    value.trim() === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return null;
  }

  return number;
}


function formatTimestamp(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}


function sanitizeFileName(
  name: string
) {
  return name
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    )
    .toLowerCase();
}


/* =========================================================
   PAGE
========================================================= */

export default function DetectionLogsPage() {

  /* =======================================================
     MAIN DATA
  ======================================================= */

  const [
    logs,
    setLogs,
  ] =
    useState<
      EditableDetection[]
    >([]);


  const [
    trials,
    setTrials,
  ] =
    useState<
      TestSession[]
    >([]);


  const [
    hazardFilter,
    setHazardFilter,
  ] =
    useState("all");


  const [
    trialFilter,
    setTrialFilter,
  ] =
    useState("all");


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    mapLogs,
    setMapLogs,
  ] =
    useState<
      EditableDetection[]
    >([]);


  const [
    mapLoading,
    setMapLoading,
  ] =
    useState(true);


  const [
    selectedMapLocation,
    setSelectedMapLocation,
  ] =
    useState<{
      latitude: number;
      longitude: number;
    } | null>(null);


  const [
    focusedDetectionId,
    setFocusedDetectionId,
  ] =
    useState<string | null>(null);


  const [
    focusRequestKey,
    setFocusRequestKey,
  ] =
    useState(0);


  const mapSectionRef =
    useRef<HTMLDivElement | null>(null);


  /* =======================================================
     IMAGE PREVIEW
  ======================================================= */

  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<
      string | null
    >(null);


  /* =======================================================
     ADD / EDIT MODAL
  ======================================================= */

  const [
    editorOpen,
    setEditorOpen,
  ] =
    useState(false);


  const [
    editorMode,
    setEditorMode,
  ] =
    useState<
      "add" | "edit"
    >("add");


  const [
    editingId,
    setEditingId,
  ] =
    useState<
      string | null
    >(null);


  const [
    form,
    setForm,
  ] =
    useState<DetectionForm>(
      EMPTY_FORM
    );


  const [
    imageFile,
    setImageFile,
  ] =
    useState<
      File | null
    >(null);


  const [
    saving,
    setSaving,
  ] =
    useState(false);


  /* =======================================================
     DELETE MODAL
  ======================================================= */

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<
      EditableDetection | null
    >(null);


  const [
    deleting,
    setDeleting,
  ] =
    useState(false);


  /* =======================================================
     STATUS MESSAGE
  ======================================================= */

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(null);


  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);


  /* =======================================================
     SORT TRIALS
  ======================================================= */

  const sortedTrials =
    useMemo(
      () =>
        [...trials].sort(
          (a, b) =>
            a.trial_number -
            b.trial_number
        ),
      [trials]
    );


  /* =======================================================
     LOAD TRIALS
  ======================================================= */

  useEffect(() => {

    getTrials()
      .then(
        setTrials
      )
      .catch(
        console.error
      );

  }, []);


  /* =======================================================
     LOAD DETECTIONS
  ======================================================= */

  const loadLogs =
    useCallback(
      async () => {

        setLoading(true);

        try {

          const data =
            await getDetections(
              1000,
              trialFilter,
              hazardFilter
            );

          setLogs(
            data as EditableDetection[]
          );

        } catch (
          error
        ) {

          console.error(
            error
          );

          setLogs([]);

        } finally {

          setLoading(false);

        }

      },
      [
        trialFilter,
        hazardFilter,
      ]
    );


  useEffect(() => {

    loadLogs();

  }, [loadLogs]);


  /* =======================================================
     LOAD MAP DETECTIONS
     Map follows the selected trial only.
     Hazard filter does not hide map markers.
  ======================================================= */

  const loadMapLogs =
    useCallback(
      async () => {

        setMapLoading(true);

        try {

          const data =
            await getDetections(
              1000,
              trialFilter
            );

          setMapLogs(
            data as EditableDetection[]
          );

        } catch (
          error
        ) {

          console.error(
            error
          );

          setMapLogs([]);

        } finally {

          setMapLoading(false);

        }

      },
      [trialFilter]
    );


  useEffect(() => {

    loadMapLogs();

  }, [loadMapLogs]);


  useEffect(() => {

    setFocusedDetectionId(
      null
    );

    setSelectedMapLocation(
      null
    );

  }, [trialFilter]);


  /* =======================================================
     MESSAGE AUTO CLEAR
  ======================================================= */

  useEffect(() => {

    if (
      !message &&
      !errorMessage
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setMessage(null);
          setErrorMessage(null);
        },
        4000
      );

    return () =>
      window.clearTimeout(
        timer
      );

  }, [
    message,
    errorMessage,
  ]);


  /* =======================================================
     FOCUS DETECTION ON MAP
  ======================================================= */

  function focusDetectionOnMap(
    log: EditableDetection
  ) {

    if (
      log.latitude == null ||
      log.longitude == null
    ) {

      setErrorMessage(
        "This detection has no GPS coordinates, so it cannot be shown on the map."
      );

      return;
    }


    setFocusedDetectionId(
      log.id
    );

    setFocusRequestKey(
      (current) =>
        current + 1
    );


    window.setTimeout(
      () => {

        mapSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

      },
      50
    );
  }


  /* =======================================================
     OPEN ADD MODAL
  ======================================================= */

  function openAddModal() {

    setEditorMode("add");
    setEditingId(null);
    setImageFile(null);

    let initialTrialId = "";

    if (
      trialFilter !== "all"
    ) {
      initialTrialId =
        trialFilter;
    }

    setForm({
      ...EMPTY_FORM,

      trialId:
        initialTrialId,

      latitude:
        selectedMapLocation
          ? selectedMapLocation
              .latitude
              .toFixed(6)
          : "",

      longitude:
        selectedMapLocation
          ? selectedMapLocation
              .longitude
              .toFixed(6)
          : "",

      createdAt:
        toDateTimeLocal(
          new Date()
            .toISOString()
        ),
    });

    setEditorOpen(true);
  }


  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  function openEditModal(
    log: EditableDetection
  ) {

    setEditorMode("edit");

    setEditingId(
      log.id
    );

    setImageFile(null);

    setForm({
      trialId:
        log.trial_id ??
        (
          trialFilter !== "all"
            ? trialFilter
            : ""
        ),

      hazardType:
        log.hazard_type,

      confidence:
        log.confidence != null
          ? String(
              log.confidence
            )
          : "",

      latitude:
        log.latitude != null
          ? String(
              log.latitude
            )
          : "",

      longitude:
        log.longitude != null
          ? String(
              log.longitude
            )
          : "",

      createdAt:
        toDateTimeLocal(
          log.created_at
        ),

      imageUrl:
        log.image_url ?? "",
    });

    setEditorOpen(true);
  }


  /* =======================================================
     CLOSE EDITOR
  ======================================================= */

  function closeEditor() {

    if (saving) return;

    setEditorOpen(false);

    setEditingId(null);

    setImageFile(null);

    setForm(
      EMPTY_FORM
    );
  }


  /* =======================================================
     UPLOAD IMAGE
  ======================================================= */

  async function uploadImage(
    file: File
  ) {

    if (
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY
    ) {
      throw new Error(
        "Supabase environment variables are missing."
      );
    }

    const safeName =
      sanitizeFileName(
        file.name
      );

    const extension =
      safeName.includes(".")
        ? safeName
            .split(".")
            .pop()
        : "jpg";

    const uniqueName =
      `${crypto.randomUUID()}.${extension}`;

    const today =
      new Date();

    const year =
      today.getFullYear();

    const month =
      String(
        today.getMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        today.getDate()
      ).padStart(
        2,
        "0"
      );

    const storagePath =
      `${year}/${month}/${day}/${uniqueName}`;


    const response =
      await fetch(
        `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${storagePath}`,
        {
          method: "POST",

          headers: {
            apikey:
              SUPABASE_ANON_KEY,

            Authorization:
              `Bearer ${SUPABASE_ANON_KEY}`,

            "Content-Type":
              file.type ||
              "application/octet-stream",

            "x-upsert":
              "true",
          },

          body:
            file,
        }
      );


    if (
      !response.ok
    ) {

      const text =
        await response.text();

      throw new Error(
        `Image upload failed: ${text}`
      );
    }


    return (
      `${SUPABASE_URL}` +
      `/storage/v1/object/public/` +
      `${STORAGE_BUCKET}/` +
      storagePath
    );
  }


  /* =======================================================
     SAVE ADD / EDIT
  ======================================================= */

  async function saveDetection() {

    setErrorMessage(null);
    setMessage(null);


    if (
      !form.trialId
    ) {

      setErrorMessage(
        "Please select a trial."
      );

      return;
    }


    if (
      !form.hazardType
    ) {

      setErrorMessage(
        "Please select a hazard type."
      );

      return;
    }


    if (
      !form.createdAt
    ) {

      setErrorMessage(
        "Please select a date and time."
      );

      return;
    }


    setSaving(true);


    try {

      let finalImageUrl =
        form.imageUrl;


      /* -----------------------------------------------
         Upload replacement / new image
      ------------------------------------------------ */

      if (
        imageFile
      ) {

        finalImageUrl =
          await uploadImage(
            imageFile
          );
      }


      /* -----------------------------------------------
         Construct payload
      ------------------------------------------------ */

      const payload = {

        hazard_type:
          form.hazardType,

        confidence:
          parseNullableNumber(
            form.confidence
          ),

        latitude:
          parseNullableNumber(
            form.latitude
          ),

        longitude:
          parseNullableNumber(
            form.longitude
          ),

        image_url:
          finalImageUrl ||
          null,

        created_at:
          new Date(
            form.createdAt
          ).toISOString(),

        trial_id:
          form.trialId,
      };


      /* -----------------------------------------------
         ADD
      ------------------------------------------------ */

      if (
        editorMode ===
        "add"
      ) {

        const response =
          await fetch(
            `${SUPABASE_URL}/rest/v1/detections`,
            {
              method:
                "POST",

              headers: {
                ...getSupabaseHeaders(),

                Prefer:
                  "return=representation",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );


        if (
          !response.ok
        ) {

          const text =
            await response.text();

          throw new Error(
            text
          );
        }


        setMessage(
          "Detection added successfully."
        );
      }


      /* -----------------------------------------------
         EDIT
      ------------------------------------------------ */

      else {

        if (
          !editingId
        ) {

          throw new Error(
            "Missing detection ID."
          );
        }


        const response =
          await fetch(
            `${SUPABASE_URL}` +
            `/rest/v1/detections` +
            `?id=eq.${editingId}`,
            {
              method:
                "PATCH",

              headers: {
                ...getSupabaseHeaders(),

                Prefer:
                  "return=representation",
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );


        if (
          !response.ok
        ) {

          const text =
            await response.text();

          throw new Error(
            text
          );
        }


        setMessage(
          "Detection updated successfully."
        );
      }


      closeEditor();

      await Promise.all([
        loadLogs(),
        loadMapLogs(),
      ]);


    } catch (
      error
    ) {

      console.error(
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save detection."
      );

    } finally {

      setSaving(false);

    }
  }


  /* =======================================================
     DELETE
  ======================================================= */

  async function confirmDelete() {

    if (
      !deleteTarget
    ) {
      return;
    }


    setDeleting(true);
    setErrorMessage(null);


    try {

      const response =
        await fetch(
          `${SUPABASE_URL}` +
          `/rest/v1/detections` +
          `?id=eq.${deleteTarget.id}`,
          {
            method:
              "DELETE",

            headers:
              getSupabaseHeaders(),
          }
        );


      if (
        !response.ok
      ) {

        const text =
          await response.text();

        throw new Error(
          text
        );
      }


      setDeleteTarget(
        null
      );

      setMessage(
        "Detection deleted."
      );

      await Promise.all([
        loadLogs(),
        loadMapLogs(),
      ]);


    } catch (
      error
    ) {

      console.error(
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete detection."
      );

    } finally {

      setDeleting(false);

    }
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <div>

      {/* ===================================================
          HEADER
      ==================================================== */}

      <PageHeader
        eyebrow="History"
        title="Detection Logs"
        description="Every hazard recorded by the system, newest first."
      />


      {/* ===================================================
          TEMPORARY EDIT MODE NOTICE
      ==================================================== */}

      <div
        className="
          mb-4
          flex
          flex-col
          md:flex-row
          md:items-center
          justify-between
          gap-3
          border
          border-yellow-500/40
          bg-yellow-500/10
          rounded-lg
          px-4
          py-3
        "
      >

        <div>

          <div
            className="
              font-mono
              text-[11px]
              tracking-[0.18em]
              uppercase
              text-yellow-400
              mb-1
            "
          >
            Data Edit Mode
          </div>

          <p
            className="
              text-xs
              text-text-muted
            "
          >
            Temporary controls are enabled for adding,
            editing, replacing images, and deleting
            detection records.
          </p>

        </div>


        <button
          type="button"
          onClick={
            openAddModal
          }
          className="
            inline-flex
            items-center
            justify-center
            px-4
            py-2
            rounded-lg
            bg-accent
            hover:bg-accent-dim
            text-white
            text-sm
            font-medium
            transition-colors
            shrink-0
          "
        >
          + Add Detection
        </button>

      </div>


      {/* ===================================================
          STATUS MESSAGES
      ==================================================== */}

      {message && (

        <div
          className="
            mb-4
            border
            border-green-500/30
            bg-green-500/10
            text-green-300
            rounded-lg
            px-4
            py-3
            text-sm
          "
        >
          {message}
        </div>

      )}


      {errorMessage && (

        <div
          className="
            mb-4
            border
            border-red-500/30
            bg-red-500/10
            text-red-300
            rounded-lg
            px-4
            py-3
            text-sm
            whitespace-pre-wrap
          "
        >
          {errorMessage}
        </div>

      )}


      {/* ===================================================
          FILTERS
      ==================================================== */}

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

          {/* HAZARD FILTER */}

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


          {/* TRIAL FILTER */}

          <select
            value={
              trialFilter
            }
            onChange={
              (event) => {

                setTrialFilter(
                  event.target.value
                );

                setSelectedMapLocation(
                  null
                );

              }
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

            {sortedTrials.map(
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


        {/* EXPORT */}

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


      {/* ===================================================
          TEMPORARY LOCATION MAP EDITOR
      ==================================================== */}

      <div
        ref={
          mapSectionRef
        }
        className="
          mb-5
          bg-base-surface
          border
          border-base-border
          rounded-lg
          overflow-hidden
        "
      >

        <div
          className="
            flex
            flex-col
            md:flex-row
            md:items-center
            justify-between
            gap-3
            px-4
            py-3
            border-b
            border-base-border
          "
        >

          <div>

            <div
              className="
                font-mono
                text-[10px]
                uppercase
                tracking-[0.18em]
                text-yellow-400
                mb-1
              "
            >
              Temporary Location Editor
            </div>

            <p
              className="
                text-sm
                text-text-primary
              "
            >
              Click anywhere on the map to choose the GPS location for a new detection.
            </p>

            <p
              className="
                text-xs
                text-text-faint
                mt-1
              "
            >
              Cyan dots are saved detections. The yellow dot is your selected location.
            </p>

          </div>


          <div
            className="
              flex
              items-center
              gap-2
              shrink-0
            "
          >

            {mapLoading && (

              <span
                className="
                  text-[11px]
                  text-text-faint
                  font-mono
                "
              >
                Loading map data…
              </span>

            )}


            {selectedMapLocation && (

              <button
                type="button"
                onClick={() =>
                  setSelectedMapLocation(
                    null
                  )
                }
                className="
                  px-3
                  py-2
                  rounded-lg
                  border
                  border-base-border
                  text-xs
                  text-text-muted
                  hover:text-white
                "
              >
                Clear Location
              </button>

            )}

          </div>

        </div>


        <div
          className="
            h-[430px]
            w-full
          "
        >

          <HazardMap
            detections={
              mapLogs
            }
            selectable={
              true
            }
            selectedPosition={
              selectedMapLocation
            }
            focusDetectionId={
              focusedDetectionId
            }
            focusRequestKey={
              focusRequestKey
            }
            onLocationSelect={(
              latitude,
              longitude
            ) => {

              setSelectedMapLocation({
                latitude,
                longitude,
              });

            }}
          />

        </div>


        <div
          className="
            px-4
            py-3
            border-t
            border-base-border
            flex
            flex-col
            lg:flex-row
            lg:items-center
            lg:justify-between
            gap-3
          "
        >

          {selectedMapLocation ? (

            <div
              className="
                flex
                flex-wrap
                gap-x-6
                gap-y-2
                font-mono
                text-xs
              "
            >

              <div>

                <span
                  className="
                    text-text-faint
                  "
                >
                  LATITUDE
                </span>

                <div
                  className="
                    text-yellow-300
                    mt-1
                  "
                >
                  {
                    selectedMapLocation
                      .latitude
                      .toFixed(6)
                  }
                </div>

              </div>


              <div>

                <span
                  className="
                    text-text-faint
                  "
                >
                  LONGITUDE
                </span>

                <div
                  className="
                    text-yellow-300
                    mt-1
                  "
                >
                  {
                    selectedMapLocation
                      .longitude
                      .toFixed(6)
                  }
                </div>

              </div>

            </div>

          ) : (

            <div
              className="
                text-xs
                text-text-faint
              "
            >
              No new location selected. Click the map to choose one.
            </div>

          )}


          <button
            type="button"
            disabled={
              !selectedMapLocation ||
              trialFilter === "all"
            }
            onClick={
              openAddModal
            }
            className="
              px-4
              py-2
              rounded-lg
              bg-accent
              hover:bg-accent-dim
              text-white
              text-sm
              font-medium
              disabled:opacity-40
              disabled:cursor-not-allowed
              shrink-0
            "
          >
            + Add Detection Here
          </button>

        </div>


        {trialFilter === "all" && (

          <div
            className="
              px-4
              pb-3
              text-[11px]
              text-yellow-400
            "
          >
            Select a specific trial first before using “Add Detection Here”.
          </div>

        )}

      </div>


      {/* ===================================================
          TABLE
      ==================================================== */}

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

              <th className="px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-text-faint">
                Actions
              </th>

            </tr>

          </thead>


          <tbody
            className="
              divide-y
              divide-base-border
            "
          >

            {/* LOADING */}

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


            {/* EMPTY */}

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


            {/* ROWS */}

            {logs.map(
              (log) => (

                <tr
                  key={
                    log.id
                  }
                  onClick={() =>
                    focusDetectionOnMap(
                      log
                    )
                  }
                  title={
                    log.latitude != null &&
                    log.longitude != null
                      ? "Click to show this detection on the map"
                      : "No GPS coordinates available"
                  }
                  className={`
                    transition-colors
                    ${
                      log.latitude != null &&
                      log.longitude != null
                        ? "cursor-pointer hover:bg-base-surface2"
                        : "cursor-default hover:bg-base-surface2"
                    }
                    ${
                      focusedDetectionId === log.id
                        ? "bg-accent/10"
                        : ""
                    }
                  `}
                >

                  {/* IMAGE */}

                  <td
                    className="
                      px-5
                      py-3
                    "
                  >

                    {log.image_url ? (

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          setSelectedImage(
                            log.image_url
                          );
                        }}
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


                  {/* HAZARD */}

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


                  {/* LATITUDE */}

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


                  {/* LONGITUDE */}

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


                  {/* TIME */}

                  <td
                    className="
                      px-5
                      py-3
                      font-mono
                      text-text-muted
                      whitespace-nowrap
                    "
                  >
                    {
                      formatTimestamp(
                        log.created_at
                      )
                    }
                  </td>


                  {/* ACTIONS */}

                  <td
                    className="
                      px-5
                      py-3
                    "
                  >

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                      "
                    >

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          openEditModal(
                            log
                          );
                        }}
                        className="
                          px-3
                          py-1.5
                          rounded-md
                          border
                          border-base-border
                          bg-base-surface2
                          hover:border-accent
                          text-xs
                          text-text-primary
                          transition-colors
                        "
                      >
                        Edit
                      </button>


                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          setDeleteTarget(
                            log
                          );
                        }}
                        className="
                          px-3
                          py-1.5
                          rounded-md
                          border
                          border-red-500/30
                          bg-red-500/10
                          hover:bg-red-500/20
                          text-xs
                          text-red-300
                          transition-colors
                        "
                      >
                        Delete
                      </button>

                    </div>

                  </td>

                </tr>

              )
            )}

          </tbody>

        </table>

      </div>


      {/* ===================================================
          ADD / EDIT MODAL
      ==================================================== */}

      {editorOpen && (

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
          onClick={
            closeEditor
          }
        >

          <div
            className="
              w-full
              max-w-2xl
              max-h-[92vh]
              overflow-y-auto
              bg-base-surface
              border
              border-base-border
              rounded-xl
              shadow-2xl
            "
            onClick={
              (event) =>
                event.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-base-border
                px-5
                py-4
              "
            >

              <div>

                <div
                  className="
                    font-mono
                    uppercase
                    tracking-[0.15em]
                    text-[10px]
                    text-accent-cyan
                    mb-1
                  "
                >
                  Data Edit Mode
                </div>

                <h2
                  className="
                    text-lg
                    font-semibold
                    text-text-primary
                  "
                >
                  {
                    editorMode ===
                    "add"
                      ? "Add Detection"
                      : "Edit Detection"
                  }
                </h2>

              </div>


              <button
                type="button"
                onClick={
                  closeEditor
                }
                className="
                  text-text-muted
                  hover:text-white
                "
              >
                ✕
              </button>

            </div>


            {/* MODAL BODY */}

            <div
              className="
                p-5
                space-y-4
              "
            >

              {/* TRIAL */}

              <div>

                <label
                  className="
                    block
                    text-xs
                    text-text-muted
                    mb-1.5
                  "
                >
                  Trial
                </label>

                <select
                  value={
                    form.trialId
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          trialId:
                            event.target.value,
                        })
                      )
                  }
                  className="
                    w-full
                    bg-base-surface2
                    border
                    border-base-border
                    rounded-lg
                    px-3
                    py-2.5
                    text-sm
                    text-text-primary
                  "
                >

                  <option value="">
                    Select Trial
                  </option>

                  {sortedTrials.map(
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


              {/* HAZARD */}

              <div>

                <label
                  className="
                    block
                    text-xs
                    text-text-muted
                    mb-1.5
                  "
                >
                  Hazard Type
                </label>

                <select
                  value={
                    form.hazardType
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          hazardType:
                            event.target.value,
                        })
                      )
                  }
                  className="
                    w-full
                    bg-base-surface2
                    border
                    border-base-border
                    rounded-lg
                    px-3
                    py-2.5
                    text-sm
                    text-text-primary
                  "
                >

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

              </div>


              {/* CONFIDENCE */}

              <div>

                <label
                  className="
                    block
                    text-xs
                    text-text-muted
                    mb-1.5
                  "
                >
                  Confidence
                </label>

                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.0001"
                  value={
                    form.confidence
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          confidence:
                            event.target.value,
                        })
                      )
                  }
                  placeholder="Example: 0.6842"
                  className="
                    w-full
                    bg-base-surface2
                    border
                    border-base-border
                    rounded-lg
                    px-3
                    py-2.5
                    text-sm
                    text-text-primary
                    font-mono
                  "
                />

              </div>


              {/* LAT / LONG */}

              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-4
                "
              >

                <div>

                  <label
                    className="
                      block
                      text-xs
                      text-text-muted
                      mb-1.5
                    "
                  >
                    Latitude
                  </label>

                  <input
                    type="number"
                    step="any"
                    value={
                      form.latitude
                    }
                    onChange={
                      (event) =>
                        setForm(
                          (current) => ({
                            ...current,

                            latitude:
                              event.target.value,
                          })
                        )
                    }
                    placeholder="14.xxxxxx"
                    className="
                      w-full
                      bg-base-surface2
                      border
                      border-base-border
                      rounded-lg
                      px-3
                      py-2.5
                      text-sm
                      text-text-primary
                      font-mono
                    "
                  />

                </div>


                <div>

                  <label
                    className="
                      block
                      text-xs
                      text-text-muted
                      mb-1.5
                    "
                  >
                    Longitude
                  </label>

                  <input
                    type="number"
                    step="any"
                    value={
                      form.longitude
                    }
                    onChange={
                      (event) =>
                        setForm(
                          (current) => ({
                            ...current,

                            longitude:
                              event.target.value,
                          })
                        )
                    }
                    placeholder="120.xxxxxx"
                    className="
                      w-full
                      bg-base-surface2
                      border
                      border-base-border
                      rounded-lg
                      px-3
                      py-2.5
                      text-sm
                      text-text-primary
                      font-mono
                    "
                  />

                </div>

              </div>


              {/* DATE / TIME */}

              <div>

                <label
                  className="
                    block
                    text-xs
                    text-text-muted
                    mb-1.5
                  "
                >
                  Detection Date & Time
                </label>

                <input
                  type="datetime-local"
                  value={
                    form.createdAt
                  }
                  onChange={
                    (event) =>
                      setForm(
                        (current) => ({
                          ...current,

                          createdAt:
                            event.target.value,
                        })
                      )
                  }
                  className="
                    w-full
                    bg-base-surface2
                    border
                    border-base-border
                    rounded-lg
                    px-3
                    py-2.5
                    text-sm
                    text-text-primary
                    font-mono
                  "
                />

              </div>


              {/* IMAGE */}

              <div>

                <label
                  className="
                    block
                    text-xs
                    text-text-muted
                    mb-1.5
                  "
                >
                  Detection Image
                </label>


                {/* CURRENT IMAGE */}

                {form.imageUrl && (

                  <div
                    className="
                      mb-3
                    "
                  >

                    <img
                      src={
                        form.imageUrl
                      }
                      alt="Current detection"
                      className="
                        w-40
                        h-28
                        object-cover
                        rounded-lg
                        border
                        border-base-border
                      "
                    />

                    <div
                      className="
                        text-[10px]
                        text-text-faint
                        mt-1
                      "
                    >
                      Current image
                    </div>

                  </div>

                )}


                {/* NEW IMAGE PREVIEW */}

                {imageFile && (

                  <div
                    className="
                      mb-3
                    "
                  >

                    <img
                      src={
                        URL.createObjectURL(
                          imageFile
                        )
                      }
                      alt="New upload"
                      className="
                        w-40
                        h-28
                        object-cover
                        rounded-lg
                        border
                        border-accent
                      "
                    />

                    <div
                      className="
                        text-[10px]
                        text-accent-cyan
                        mt-1
                      "
                    >
                      New image selected
                    </div>

                  </div>

                )}


                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    (event) => {

                      const file =
                        event.target
                          .files?.[0] ??
                        null;

                      setImageFile(
                        file
                      );

                    }
                  }
                  className="
                    block
                    w-full
                    text-sm
                    text-text-muted
                    file:mr-3
                    file:py-2
                    file:px-3
                    file:rounded-md
                    file:border-0
                    file:bg-accent
                    file:text-white
                    file:text-sm
                    file:cursor-pointer
                  "
                />

                <p
                  className="
                    text-[11px]
                    text-text-faint
                    mt-2
                  "
                >
                  Selecting a new image will automatically upload it
                  to the hazard-images Supabase Storage bucket.
                </p>

              </div>

            </div>


            {/* MODAL FOOTER */}

            <div
              className="
                flex
                justify-end
                gap-3
                border-t
                border-base-border
                px-5
                py-4
              "
            >

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={
                  closeEditor
                }
                className="
                  px-4
                  py-2
                  rounded-lg
                  border
                  border-base-border
                  text-sm
                  text-text-muted
                  hover:text-white
                  disabled:opacity-50
                "
              >
                Cancel
              </button>


              <button
                type="button"
                disabled={
                  saving
                }
                onClick={
                  saveDetection
                }
                className="
                  px-4
                  py-2
                  rounded-lg
                  bg-accent
                  hover:bg-accent-dim
                  text-sm
                  text-white
                  font-medium
                  disabled:opacity-50
                  disabled:cursor-not-allowed
                "
              >
                {
                  saving
                    ? "Saving..."
                    : editorMode ===
                      "add"
                    ? "Add Detection"
                    : "Save Changes"
                }
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ===================================================
          DELETE CONFIRMATION MODAL
      ==================================================== */}

      {deleteTarget && (

        <div
          className="
            fixed
            inset-0
            z-[10000]
            bg-black/80
            flex
            items-center
            justify-center
            p-4
          "
          onClick={() => {

            if (
              !deleting
            ) {
              setDeleteTarget(
                null
              );
            }

          }}
        >

          <div
            className="
              w-full
              max-w-md
              bg-base-surface
              border
              border-base-border
              rounded-xl
              p-5
              shadow-2xl
            "
            onClick={
              (event) =>
                event.stopPropagation()
            }
          >

            <div
              className="
                text-lg
                font-semibold
                text-text-primary
                mb-2
              "
            >
              Delete Detection?
            </div>


            <p
              className="
                text-sm
                text-text-muted
                mb-4
              "
            >
              This will permanently remove the selected
              <span className="text-white">
                {" "}
                {deleteTarget.hazard_type}
                {" "}
              </span>
              detection from the database.
            </p>


            {deleteTarget.image_url && (

              <img
                src={
                  deleteTarget.image_url
                }
                alt="Detection to delete"
                className="
                  w-full
                  max-h-52
                  object-contain
                  rounded-lg
                  border
                  border-base-border
                  bg-black
                  mb-4
                "
              />

            )}


            <div
              className="
                flex
                justify-end
                gap-3
              "
            >

              <button
                type="button"
                disabled={
                  deleting
                }
                onClick={() =>
                  setDeleteTarget(
                    null
                  )
                }
                className="
                  px-4
                  py-2
                  rounded-lg
                  border
                  border-base-border
                  text-sm
                  text-text-muted
                  disabled:opacity-50
                "
              >
                Cancel
              </button>


              <button
                type="button"
                disabled={
                  deleting
                }
                onClick={
                  confirmDelete
                }
                className="
                  px-4
                  py-2
                  rounded-lg
                  bg-red-600
                  hover:bg-red-500
                  text-white
                  text-sm
                  font-medium
                  disabled:opacity-50
                "
              >
                {
                  deleting
                    ? "Deleting..."
                    : "Delete"
                }
              </button>

            </div>

          </div>

        </div>

      )}


      {/* ===================================================
          IMAGE PREVIEW MODAL
      ==================================================== */}

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