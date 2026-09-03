"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  endTrial,
  getActiveTrial,
  startTrial,
} from "@/lib/api";

import {
  TestSession,
} from "@/types/detection";


export default function TrialControl() {

  const [
    activeTrial,
    setActiveTrial,
  ] =
    useState<TestSession | null>(
      null
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    working,
    setWorking,
  ] =
    useState(false);


  const refresh =
    useCallback(
      async () => {

        try {
          const response =
            await getActiveTrial();

          setActiveTrial(
            response.trial
          );

        } catch (error) {

          console.error(
            "Trial status error:",
            error
          );

        } finally {

          setLoading(false);

        }

      },
      []
    );


  useEffect(() => {

    refresh();


    const interval =
      window.setInterval(
        refresh,
        3000
      );


    return () => {

      window.clearInterval(
        interval
      );

    };

  }, [refresh]);


  async function handleStart() {

    try {

      setWorking(true);


      const trial =
        await startTrial();


      setActiveTrial(
        trial
      );

    } catch (error) {

      alert(
        error instanceof Error
          ? error.message
          : "Unable to start trial."
      );

    } finally {

      setWorking(false);

    }

  }


  async function handleEnd() {

    const confirmed =
      window.confirm(
        "End current trial?"
      );


    if (!confirmed) {
      return;
    }


    try {

      setWorking(true);


      await endTrial();


      setActiveTrial(
        null
      );

    } catch (error) {

      alert(
        error instanceof Error
          ? error.message
          : "Unable to end trial."
      );

    } finally {

      setWorking(false);

    }

  }


  if (loading) {

    return (

      <div
        className="
          bg-base-surface
          border
          border-base-border
          rounded-lg
          px-5
          py-4
          mb-5
          text-sm
          text-text-muted
        "
      >
        Loading field test…
      </div>

    );

  }


  return (

    <div
      className="
        bg-base-surface
        border
        border-base-border
        rounded-lg
        p-5
        mb-5
      "
    >

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:items-center
          justify-between
          gap-4
        "
      >

        <div>

          <p
            className="
              font-mono
              text-[10px]
              uppercase
              tracking-wider
              text-text-faint
            "
          >
            Field Test Session
          </p>


          {activeTrial ? (

            <>

              <div
                className="
                  flex
                  items-center
                  gap-2
                  mt-2
                "
              >

                <span
                  className="
                    h-2.5
                    w-2.5
                    rounded-full
                    bg-status-online
                    animate-pulse
                  "
                />


                <p
                  className="
                    text-lg
                    font-semibold
                    text-text-primary
                  "
                >
                  Trial {
                    activeTrial.trial_number
                  } Active
                </p>

              </div>


              <p
                className="
                  text-xs
                  text-text-muted
                  mt-1
                "
              >
                Started{" "}
                {
                  new Date(
                    activeTrial.started_at
                  ).toLocaleString()
                }
              </p>

            </>

          ) : (

            <>

              <p
                className="
                  text-lg
                  font-semibold
                  text-text-primary
                  mt-2
                "
              >
                No Active Trial
              </p>


              <p
                className="
                  text-xs
                  text-text-muted
                  mt-1
                "
              >
                Start a new field-testing session.
              </p>

            </>

          )}

        </div>


        {activeTrial ? (

          <button
            type="button"
            disabled={
              working
            }
            onClick={
              handleEnd
            }
            className="
              bg-red-600
              hover:bg-red-700
              disabled:opacity-50
              text-white
              px-5
              py-2.5
              rounded-lg
              text-sm
              font-medium
              transition-colors
            "
          >
            {
              working
                ? "Ending..."
                : "End Trial"
            }
          </button>

        ) : (

          <button
            type="button"
            disabled={
              working
            }
            onClick={
              handleStart
            }
            className="
              bg-accent
              hover:bg-accent-dim
              disabled:opacity-50
              text-white
              px-5
              py-2.5
              rounded-lg
              text-sm
              font-medium
              transition-colors
            "
          >
            {
              working
                ? "Starting..."
                : "Start New Trial"
            }
          </button>

        )}

      </div>

    </div>

  );

}