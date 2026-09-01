"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CameraOff,
  Loader2,
} from "lucide-react";

import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { supabase } from "@/lib/supabaseClient";
import { Detection } from "@/types/detection";


const STREAM_URL =
  process.env.NEXT_PUBLIC_PI_STREAM_URL;


/*
 * Automatically convert:
 *
 * http://10.143.80.51:8001/video_feed
 *
 * into:
 *
 * http://10.143.80.51:8001/detections
 */
const DETECTIONS_URL = STREAM_URL
  ? STREAM_URL.replace(
      /\/video_feed\/?$/,
      "/detections"
    )
  : undefined;


type LiveDetection = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  class_id: number;
  class_name: string;
  confidence: number;
};


type LiveDetectionResponse = {
  timestamp?: number;
  inference_time?: number;

  gps_fix?: boolean;

  latitude?: number | null;
  longitude?: number | null;

  detections?: LiveDetection[];
};


export default function LiveMonitoringPage() {

  const [
    latest,
    setLatest,
  ] = useState<Detection | null>(
    null
  );


  const [
    streamOk,
    setStreamOk,
  ] = useState(false);


  const [
    checkingStream,
    setCheckingStream,
  ] = useState(true);


  const imageRef =
    useRef<HTMLImageElement | null>(
      null
    );


  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );


  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );


  const detectionsRef =
    useRef<LiveDetection[]>([]);


  /*
   * ========================================================
   * SUPABASE
   * Current detection panel
   * ========================================================
   */

  useEffect(() => {

    supabase
      .from("detections")
      .select("*")
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .then(({ data }) => {

        if (
          data &&
          data.length > 0
        ) {

          setLatest(
            data[0] as Detection
          );

        }

      });


    const channel =
      supabase
        .channel(
          "live-detections"
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "detections",
          },
         (payload) => {
            setLatest(payload.new as Detection);
          }
        )
        .subscribe();


    return () => {

      supabase.removeChannel(
        channel
      );

    };

  }, []);


  /*
   * ========================================================
   * DRAW YOLO BOXES
   * ========================================================
   */

  const drawDetections =
    useCallback(() => {

      const image =
        imageRef.current;

      const canvas =
        canvasRef.current;

      const container =
        containerRef.current;


      if (
        !image ||
        !canvas ||
        !container
      ) {
        return;
      }


      const containerWidth =
        container.clientWidth;

      const containerHeight =
        container.clientHeight;


      if (
        containerWidth <= 0 ||
        containerHeight <= 0
      ) {
        return;
      }


      /*
       * Canvas uses physical pixels.
       */
      const dpr =
        window.devicePixelRatio || 1;


      canvas.width =
        Math.round(
          containerWidth * dpr
        );

      canvas.height =
        Math.round(
          containerHeight * dpr
        );


      canvas.style.width =
        `${containerWidth}px`;

      canvas.style.height =
        `${containerHeight}px`;


      const context =
        canvas.getContext(
          "2d"
        );


      if (!context) {
        return;
      }


      context.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );


      context.clearRect(
        0,
        0,
        containerWidth,
        containerHeight
      );


      /*
       * YOLO receives a 640 × 480
       * frame from the Pi camera.
       *
       * But the <img> uses object-contain,
       * which may create black bars.
       *
       * Calculate the actual displayed
       * image position first.
       */

      const sourceWidth =
        image.naturalWidth || 640;

      const sourceHeight =
        image.naturalHeight || 480;


      const sourceRatio =
        sourceWidth /
        sourceHeight;

      const containerRatio =
        containerWidth /
        containerHeight;


      let displayWidth:
        number;

      let displayHeight:
        number;

      let offsetX = 0;
      let offsetY = 0;


      if (
        sourceRatio >
        containerRatio
      ) {

        displayWidth =
          containerWidth;

        displayHeight =
          containerWidth /
          sourceRatio;

        offsetY =
          (
            containerHeight -
            displayHeight
          ) / 2;

      } else {

        displayHeight =
          containerHeight;

        displayWidth =
          containerHeight *
          sourceRatio;

        offsetX =
          (
            containerWidth -
            displayWidth
          ) / 2;

      }


      const scaleX =
        displayWidth /
        sourceWidth;

      const scaleY =
        displayHeight /
        sourceHeight;


      for (
        const detection
        of detectionsRef.current
      ) {

        const x =
          offsetX +
          detection.x1 *
            scaleX;

        const y =
          offsetY +
          detection.y1 *
            scaleY;

        const width =
          (
            detection.x2 -
            detection.x1
          ) *
          scaleX;

        const height =
          (
            detection.y2 -
            detection.y1
          ) *
          scaleY;


        /*
         * Box
         */

        context.lineWidth = 3;

        context.strokeStyle =
          "#22d3ee";

        context.strokeRect(
          x,
          y,
          width,
          height
        );


        /*
         * Label
         *
         * Class name ONLY.
         * No confidence percentage.
         */

        const label =
          detection.class_name;


        context.font =
          "600 14px monospace";


        const paddingX = 7;
        const paddingY = 5;


        const textWidth =
          context.measureText(
            label
          ).width;


        const labelWidth =
          textWidth +
          paddingX * 2;

        const labelHeight =
          25;


        let labelY =
          y -
          labelHeight;


        if (
          labelY < 0
        ) {

          labelY = y;

        }


        context.fillStyle =
          "rgba(8, 15, 30, 0.88)";


        context.fillRect(
          x,
          labelY,
          labelWidth,
          labelHeight
        );


        context.fillStyle =
          "#22d3ee";


        context.fillText(
          label,
          x + paddingX,
          labelY +
            labelHeight -
            paddingY -
            2
        );

      }

    }, []);


  /*
   * ========================================================
   * POLL LIVE YOLO RESULTS FROM PI
   * ========================================================
   */

  useEffect(() => {

    if (
      !DETECTIONS_URL
    ) {
      return;
    }


    let stopped = false;


    const getDetections =
      async () => {

        try {

          const response =
            await fetch(
              `${DETECTIONS_URL}?t=${Date.now()}`,
              {
                cache: "no-store",
              }
            );


          if (
            !response.ok
          ) {
            return;
          }


          const data =
            (
              await response.json()
            ) as LiveDetectionResponse;


          if (stopped) {
            return;
          }


          detectionsRef.current =
            data.detections ?? [];


          drawDetections();

        } catch {

          /*
           * Do not kill camera stream
           * when the detection endpoint
           * temporarily fails.
           */

          detectionsRef.current =
            [];

          drawDetections();

        }

      };


    /*
     * 300 ms fits the current
     * ~0.35 s detector cycle better
     * than polling extremely fast.
     */

    const interval =
      window.setInterval(
        getDetections,
        300
      );


    getDetections();


    return () => {

      stopped = true;

      window.clearInterval(
        interval
      );

    };

  }, [drawDetections]);


  /*
   * ========================================================
   * HANDLE WINDOW RESIZE
   * ========================================================
   */

  useEffect(() => {

    const container =
      containerRef.current;


    if (!container) {
      return;
    }


    const observer =
      new ResizeObserver(
        () => {

          drawDetections();

        }
      );


    observer.observe(
      container
    );


    return () => {

      observer.disconnect();

    };

  }, [drawDetections]);


  /*
   * ========================================================
   * STREAM TIMEOUT
   *
   * IMPORTANT:
   * We no longer create another new Image().
   *
   * The actual MJPEG <img> itself determines
   * whether the stream is alive.
   * ========================================================
   */

  useEffect(() => {

    if (!STREAM_URL) {

      setCheckingStream(
        false
      );

      setStreamOk(
        false
      );

      return;

    }


    const timeout =
      window.setTimeout(
        () => {

          setCheckingStream(
            false
          );

        },
        8000
      );


    return () => {

      window.clearTimeout(
        timeout
      );

    };

  }, []);


  const handleStreamLoaded =
    () => {

      setStreamOk(
        true
      );

      setCheckingStream(
        false
      );


      requestAnimationFrame(
        () => {

          drawDetections();

        }
      );

    };


  const handleStreamError =
    () => {

      setStreamOk(
        false
      );

      setCheckingStream(
        false
      );

      detectionsRef.current =
        [];

      drawDetections();

    };


  const isLive =
    streamOk;


  return (

    <div>

      <PageHeader
        eyebrow="Camera"
        title="Camera Monitoring"
        description="Real-time camera feed and road hazard detection powered by YOLOv8."
      />


      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-3
          gap-5
        "
      >

        {/* =================================================
            CAMERA
        ================================================= */}

        <div
          className="
            lg:col-span-2
          "
        >

          <div
            ref={containerRef}
            className="
              bg-base-surface
              border
              border-base-border
              rounded-lg
              overflow-hidden
              aspect-video
              relative
            "
          >

            {STREAM_URL && (

              <img
                ref={imageRef}
                src={STREAM_URL}
                alt="Road Hazard Detection Camera"
                className="
                  absolute
                  inset-0
                  w-full
                  h-full
                  object-contain
                "
                onLoad={
                  handleStreamLoaded
                }
                onError={
                  handleStreamError
                }
              />

            )}


            {/* YOLO bounding boxes */}

            <canvas
              ref={canvasRef}
              className="
                absolute
                inset-0
                w-full
                h-full
                pointer-events-none
                z-10
              "
            />


            {/* Loading */}

            {checkingStream && (

              <div
                className="
                  absolute
                  inset-0
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                  bg-base-surface
                  z-20
                "
              >

                <Loader2
                  className="
                    h-10
                    w-10
                    animate-spin
                    text-accent-cyan
                    mb-3
                  "
                />

                <p
                  className="
                    text-text-primary
                    font-medium
                  "
                >
                  Connecting Camera...
                </p>

              </div>

            )}


            {/* Offline */}

            {!checkingStream &&
              !isLive && (

              <div
                className="
                  absolute
                  inset-0
                  flex
                  flex-col
                  items-center
                  justify-center
                  text-center
                  px-6
                  bg-base-surface
                  z-20
                "
              >

                <CameraOff
                  className="
                    h-14
                    w-14
                    text-text-faint
                    mb-4
                  "
                />

                <h3
                  className="
                    text-lg
                    font-semibold
                    text-text-primary
                  "
                >
                  Camera Offline
                </h3>

                <p
                  className="
                    text-sm
                    text-text-muted
                    mt-2
                    max-w-sm
                  "
                >
                  No camera feed detected.
                  Waiting for Raspberry Pi
                  camera connection.
                </p>

              </div>

            )}


            {/* LIVE badge */}

            <span
              className={`
                absolute
                top-3
                left-3
                z-30
                flex
                items-center
                gap-1.5
                backdrop-blur
                px-3
                py-1
                rounded-full
                font-mono
                text-[10px]
                font-semibold

                ${
                  checkingStream
                    ? "bg-black/50 text-status-idle"
                    : isLive
                    ? "bg-black/50 text-status-online"
                    : "bg-black/50 text-status-offline"
                }
              `}
            >

              <span
                className={`
                  h-2
                  w-2
                  rounded-full

                  ${
                    checkingStream
                      ? "bg-status-idle animate-pulse"
                      : isLive
                      ? "bg-status-online animate-pulse"
                      : "bg-status-offline"
                  }
                `}
              />


              {
                checkingStream
                  ? "CONNECTING"
                  : isLive
                  ? "LIVE"
                  : "OFFLINE"
              }

            </span>

          </div>

        </div>


        {/* =================================================
            CURRENT DETECTION PANEL
        ================================================= */}

        <div
          className="
            bg-base-surface
            border
            border-base-border
            rounded-lg
            p-5
          "
        >

          <p
            className="
              font-mono
              text-[11px]
              uppercase
              tracking-wider
              text-text-faint
              mb-4
            "
          >
            Current Detection
          </p>


          {latest ? (

            <div
              className="
                space-y-4
              "
            >

              <div>

                <p
                  className="
                    text-xs
                    text-text-faint
                  "
                >
                  Hazard Type
                </p>

                <p
                  className="
                    text-lg
                    text-text-primary
                    mt-1
                  "
                >
                  {
                    latest.hazard_type
                  }
                </p>

              </div>


              <div>

                <p
                  className="
                    text-xs
                    text-text-faint
                  "
                >
                  Confidence Score
                </p>

                <p
                  className="
                    font-mono
                    text-lg
                    text-accent-cyan
                    mt-1
                  "
                >
                  {
                    (
                      latest.confidence *
                      100
                    ).toFixed(1)
                  }%
                </p>

              </div>


              <div>

                <p
                  className="
                    text-xs
                    text-text-faint
                  "
                >
                  Detection Time
                </p>

                <p
                  className="
                    font-mono
                    text-sm
                    text-text-primary
                    mt-1
                  "
                >
                  {
                    new Date(
                      latest.created_at
                    ).toLocaleString()
                  }
                </p>

              </div>


              <div>

                <p
                  className="
                    text-xs
                    text-text-faint
                  "
                >
                  GPS Coordinates
                </p>

                <p
                  className="
                    font-mono
                    text-sm
                    text-text-primary
                    mt-1
                  "
                >
                  {
                    latest.latitude
                      ?.toFixed(5)
                      ?? "—"
                  },
                  {" "}
                  {
                    latest.longitude
                      ?.toFixed(5)
                      ?? "—"
                  }
                </p>

              </div>

            </div>

          ) : (

            <div
              className="
                py-6
                text-center
              "
            >

              <p
                className="
                  text-sm
                  text-text-muted
                "
              >
                No detections recorded yet.
              </p>

            </div>

          )}


          <div
            className="
              mt-6
              pt-4
              border-t
              border-base-border
            "
          >

            <StatusBadge
              online={
                !!latest
              }
              onlineLabel="Receiving detections"
              offlineLabel="Waiting for detections"
            />

          </div>

        </div>

      </div>

    </div>

  );

}