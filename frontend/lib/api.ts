import {
  ActiveTrialResponse,
  Detection,
  SystemStatus,
  TestSession,
} from "@/types/detection";


const API_URL =
  process.env.NEXT_PUBLIC_API_URL;


function getApiUrl(): string {
  if (!API_URL) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not configured."
    );
  }

  return API_URL.replace(
    /\/$/,
    ""
  );
}


export async function getStatus():
  Promise<SystemStatus> {

  const api =
    getApiUrl();


  const response =
    await fetch(
      `${api}/api/status`,
      {
        cache: "no-store",
      }
    );


  if (!response.ok) {
    throw new Error(
      "Failed to fetch status"
    );
  }


  return response.json();
}


export async function getDetections(
  limit = 100,
  trialId = "all",
  hazardType = "all"
): Promise<Detection[]> {

  const api =
    getApiUrl();


  const params =
    new URLSearchParams();


  params.set(
    "limit",
    String(limit)
  );


  if (
    trialId !== "all"
  ) {
    params.set(
      "trial_id",
      trialId
    );
  }


  if (
    hazardType !== "all"
  ) {
    params.set(
      "hazard_type",
      hazardType
    );
  }


  const response =
    await fetch(
      `${api}/api/detections?${params.toString()}`,
      {
        cache: "no-store",
      }
    );


  if (!response.ok) {
    throw new Error(
      "Failed to fetch detections"
    );
  }


  return response.json();
}


export function getExportUrl(
  trialId = "all"
): string {

  const api =
    getApiUrl();


  if (
    trialId !== "all"
  ) {
    return (
      `${api}/api/detections/export` +
      `?trial_id=${encodeURIComponent(trialId)}`
    );
  }


  return (
    `${api}/api/detections/export`
  );
}


export async function getTrials():
  Promise<TestSession[]> {

  const api =
    getApiUrl();


  const response =
    await fetch(
      `${api}/api/trials`,
      {
        cache: "no-store",
      }
    );


  if (!response.ok) {
    throw new Error(
      "Failed to fetch trials"
    );
  }


  return response.json();
}


export async function getActiveTrial():
  Promise<ActiveTrialResponse> {

  const api =
    getApiUrl();


  const response =
    await fetch(
      `${api}/api/trials/active`,
      {
        cache: "no-store",
      }
    );


  if (!response.ok) {
    throw new Error(
      "Failed to fetch active trial"
    );
  }


  return response.json();
}


export async function startTrial():
  Promise<TestSession> {

  const api =
    getApiUrl();


  const response =
    await fetch(
      `${api}/api/trials/start`,
      {
        method: "POST",
      }
    );


  if (!response.ok) {
    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    throw new Error(
      data.detail ||
      "Failed to start trial"
    );
  }


  return response.json();
}


export async function endTrial():
  Promise<TestSession> {

  const api =
    getApiUrl();


  const response =
    await fetch(
      `${api}/api/trials/end`,
      {
        method: "POST",
      }
    );


  if (!response.ok) {
    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    throw new Error(
      data.detail ||
      "Failed to end trial"
    );
  }


  return response.json();
}