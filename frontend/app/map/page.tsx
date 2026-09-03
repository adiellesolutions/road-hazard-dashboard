"use client";

import {
  useEffect,
  useState,
} from "react";

import dynamic from "next/dynamic";

import PageHeader from "@/components/PageHeader";

import {
  getDetections,
  getTrials,
} from "@/lib/api";

import {
  Detection,
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
            h-full
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


export default function MapPage() {

  const [
    detections,
    setDetections,
  ] =
    useState<Detection[]>([]);


  const [
    trials,
    setTrials,
  ] =
    useState<TestSession[]>([]);


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
      trialFilter
    )
      .then(
        setDetections
      )
      .catch((error) => {

        console.error(
          error
        );

        setDetections([]);

      })
      .finally(
        () =>
          setLoading(false)
      );

  }, [
    trialFilter
  ]);


  const located =
    detections.filter(
      (detection) =>
        detection.latitude != null &&
        detection.longitude != null
    );


  return (

    <div
      className="
        flex
        flex-col
        h-[calc(100vh-7rem)]
      "
    >

      <PageHeader
        eyebrow="Geography"
        title="Hazard Map"
        description={`${located.length} detection${
          located.length === 1
            ? ""
            : "s"
        } with GPS coordinates. Click a marker for details.`}
      />


      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          mb-4
        "
      >

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


        {loading && (

          <span
            className="
              text-xs
              text-text-faint
              font-mono
            "
          >
            Loading…
          </span>

        )}

      </div>


      <div
        className="
          flex-1
          bg-base-surface
          border
          border-base-border
          rounded-lg
          overflow-hidden
          min-h-[400px]
        "
      >

        <HazardMap
          detections={
            detections
          }
        />

      </div>

    </div>

  );

}