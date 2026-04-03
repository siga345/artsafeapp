import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const baseUrl = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const artistEmail = process.env.ARTIST_EMAIL ?? "demo@artsafehub.app";
const artistPassword = process.env.ARTIST_PASSWORD ?? "demo1234";
const specialistEmail = process.env.SPECIALIST_EMAIL ?? "smoke-specialist@artsafehub.app";
const peerArtistEmail = process.env.PEER_ARTIST_EMAIL ?? "smoke-peer-artist@artsafehub.app";

class CookieJar {
  #cookies = new Map();

  setFromHeader(setCookieValue) {
    const cookiePair = setCookieValue.split(";")[0] ?? "";
    const separatorIndex = cookiePair.indexOf("=");
    if (separatorIndex <= 0) return;
    const name = cookiePair.slice(0, separatorIndex).trim();
    const value = cookiePair.slice(separatorIndex + 1).trim();
    if (!name) return;
    this.#cookies.set(name, value);
  }

  updateFromResponse(response) {
    const headerValues = getSetCookieHeaders(response.headers);
    for (const headerValue of headerValues) {
      this.setFromHeader(headerValue);
    }
  }

  toHeaderValue() {
    if (!this.#cookies.size) return "";
    return Array.from(this.#cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

function getSetCookieHeaders(headers) {
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const merged = headers.get("set-cookie");
  if (!merged) return [];
  return merged.split(/,(?=\s*[^;=]+=[^;]+)/g);
}

async function parseJsonResponse(response) {
  const raw = await response.text();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function assertOk(response, payload, fallbackMessage) {
  if (response.ok) return;
  const payloadError =
    payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : null;
  const rawBody =
    payload && typeof payload === "object" && "raw" in payload && typeof payload.raw === "string" ? payload.raw : null;
  throw new Error(`${fallbackMessage} (${response.status})${payloadError ? `: ${payloadError}` : rawBody ? `: ${rawBody}` : ""}`);
}

async function ensureSpecialistUser() {
  const passwordHash = await bcrypt.hash("smoke-specialist-password", 8);

  const user = await prisma.user.upsert({
    where: { email: specialistEmail },
    create: {
      email: specialistEmail,
      passwordHash,
      nickname: "Smoke Specialist",
      role: "SPECIALIST"
    },
    update: {
      role: "SPECIALIST",
      nickname: "Smoke Specialist"
    },
    select: { id: true }
  });

  await prisma.specialistProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      category: "AUDIO_ENGINEER",
      city: "Moscow",
      isOnline: true,
      isAvailableNow: true,
      services: ["Сведение", "Мастеринг"],
      credits: ["Smoke E2E"],
      portfolioLinks: [],
      budgetFrom: 5000
    },
    update: {
      category: "AUDIO_ENGINEER",
      city: "Moscow",
      isOnline: true,
      isAvailableNow: true,
      services: ["Сведение", "Мастеринг"],
      credits: ["Smoke E2E"],
      budgetFrom: 5000
    }
  });

  return user.id;
}

async function ensurePeerArtistFixture() {
  const passwordHash = await bcrypt.hash("smoke-peer-artist-password", 8);
  const user = await prisma.user.upsert({
    where: { email: peerArtistEmail },
    create: {
      email: peerArtistEmail,
      passwordHash,
      nickname: "Smoke Peer Artist",
      role: "ARTIST"
    },
    update: {
      nickname: "Smoke Peer Artist",
      role: "ARTIST"
    },
    select: { id: true, safeId: true }
  });

  await prisma.artistIdentityProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      identityStatement: "Smoke peer artist identity",
      currentFocusTitle: "Секретный фокус",
      currentFocusDetail: "Скрытая деталь рабочего процесса",
      seekingSupportDetail: "Нужен внешний взгляд на припев",
      supportNeedTypes: ["FEEDBACK"]
    },
    update: {
      identityStatement: "Smoke peer artist identity",
      currentFocusTitle: "Секретный фокус",
      currentFocusDetail: "Скрытая деталь рабочего процесса",
      seekingSupportDetail: "Нужен внешний взгляд на припев",
      supportNeedTypes: ["FEEDBACK"]
    }
  });

  const track = await prisma.track.upsert({
    where: { id: `smoke-peer-track-${user.id}` },
    create: {
      id: `smoke-peer-track-${user.id}`,
      userId: user.id,
      title: "Smoke Peer Track",
      workbenchState: "NEEDS_FEEDBACK"
    },
    update: {
      title: "Smoke Peer Track",
      workbenchState: "NEEDS_FEEDBACK"
    },
    select: { id: true }
  });

  await prisma.trackIntent.upsert({
    where: { trackId: track.id },
    create: {
      trackId: track.id,
      summary: "Проверить скрытый peer track",
      whyNow: "Нужно убедиться, что derivedFocus не утекает."
    },
    update: {
      summary: "Проверить скрытый peer track",
      whyNow: "Нужно убедиться, что derivedFocus не утекает."
    }
  });

  await prisma.trackNextStep.create({
    data: {
      userId: user.id,
      trackId: track.id,
      text: "Smoke peer next step",
      reason: "Нужен приватный peer-only контекст",
      status: "ACTIVE",
      recommendationSource: "MANUAL",
      origin: "SONG_DETAIL"
    }
  }).catch(() => null);

  const demo = await prisma.demo.upsert({
    where: { id: `smoke-peer-demo-${user.id}` },
    create: {
      id: `smoke-peer-demo-${user.id}`,
      trackId: track.id,
      audioUrl: "private/demos/2026/03/19/smoke-peer-demo.wav",
      duration: 1,
      versionType: "DEMO",
      sortIndex: 0
    },
    update: {
      trackId: track.id,
      audioUrl: "private/demos/2026/03/19/smoke-peer-demo.wav",
      duration: 1,
      versionType: "DEMO",
      sortIndex: 0
    },
    select: { id: true, trackId: true }
  });

  return {
    userId: user.id,
    safeId: user.safeId,
    trackId: track.id,
    demoId: demo.id
  };
}

function createSilentWavBlob({ durationSec = 1, sampleRate = 8000 } = {}) {
  const sampleCount = Math.max(1, Math.floor(durationSec * sampleRate));
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  return new Blob([buffer], { type: "audio/wav" });
}

async function run() {
  const specialistUserId = await ensureSpecialistUser();
  const peerArtist = await ensurePeerArtistFixture();
  const cookies = new CookieJar();

  async function fetchWithCookies(path, init = {}) {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = new Headers(init.headers ?? {});
    const cookieHeader = cookies.toHeaderValue();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    const response = await fetch(url, { ...init, headers, redirect: init.redirect ?? "manual" });
    cookies.updateFromResponse(response);
    return response;
  }

  const csrfResponse = await fetchWithCookies("/api/auth/csrf");
  const csrfPayload = await parseJsonResponse(csrfResponse);
  assertOk(csrfResponse, csrfPayload, "Не удалось получить CSRF токен");
  if (!csrfPayload?.csrfToken) {
    throw new Error("CSRF токен отсутствует в ответе /api/auth/csrf");
  }

  const loginBody = new URLSearchParams({
    csrfToken: csrfPayload.csrfToken,
    email: artistEmail,
    password: artistPassword,
    callbackUrl: `${baseUrl}/today`,
    json: "true"
  });
  const loginResponse = await fetchWithCookies("/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: loginBody.toString()
  });
  const loginPayload = await parseJsonResponse(loginResponse);
  if (!(loginResponse.ok || loginResponse.status === 302)) {
    assertOk(loginResponse, loginPayload, "Не удалось выполнить login");
  }

  const sessionResponse = await fetchWithCookies("/api/auth/session");
  const sessionPayload = await parseJsonResponse(sessionResponse);
  assertOk(sessionResponse, sessionPayload, "Не удалось загрузить session");
  if (!sessionPayload?.user?.email) {
    throw new Error("После login не получена активная session.");
  }

  const idResponse = await fetchWithCookies("/api/id");
  const idPayload = await parseJsonResponse(idResponse);
  assertOk(idResponse, idPayload, "Не удалось загрузить ID профиль");
  if (!idPayload?.safeId || !idPayload?.nickname) {
    throw new Error("API /api/id не вернул базовый профиль артиста.");
  }

  const stagesResponse = await fetchWithCookies("/api/songs/stages");
  const stagesPayload = await parseJsonResponse(stagesResponse);
  assertOk(stagesResponse, stagesPayload, "Не удалось загрузить этапы треков");
  const stages = Array.isArray(stagesPayload) ? stagesPayload : [];
  const demoStage = stages.find((stage) => typeof stage?.name === "string" && stage.name.toLowerCase().includes("демо"));
  const stageId = demoStage?.id ?? stages[0]?.id ?? null;
  if (!stageId) {
    throw new Error("Не найден stage для создания тестового трека.");
  }

  const titleSuffix = Date.now();
  const createSongResponse = await fetchWithCookies("/api/songs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `Smoke Song ${titleSuffix}`,
      lyricsText: "Smoke test lyrics",
      pathStageId: stageId
    })
  });
  const createSongPayload = await parseJsonResponse(createSongResponse);
  assertOk(createSongResponse, createSongPayload, "Не удалось создать трек");
  const trackId = createSongPayload?.id;
  if (!trackId) {
    throw new Error("API /api/songs не вернул track id.");
  }

  const formData = new FormData();
  formData.append("trackId", trackId);
  formData.append("durationSec", "1");
  formData.append("noteText", "smoke test version");
  formData.append("reflectionWhyMade", "Проверить рабочую мастерскую трека");
  formData.append("reflectionWhatChanged", "Загрузил первую тестовую демо-версию");
  formData.append("reflectionWhatNotWorking", "Нужен следующий шаг после загрузки");
  formData.append("versionType", "DEMO");
  formData.append("file", createSilentWavBlob(), `smoke-${titleSuffix}.wav`);

  const focusResponse = await fetchWithCookies("/api/home/track-focus", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trackId,
      focusNote: "Smoke focus on one active track",
      createNextStep: {
        text: "Проверить загрузку версии",
        reason: "Убедиться, что у трека появился активный шаг до вечернего wrap-up"
      }
    })
  });
  const focusPayload = await parseJsonResponse(focusResponse);
  assertOk(focusResponse, focusPayload, "Не удалось сохранить утренний фокус");
  if (!focusPayload?.track?.id && !focusPayload?.id) {
    throw new Error("API /api/home/track-focus не вернул focus payload.");
  }

  const uploadResponse = await fetchWithCookies("/api/audio-clips", {
    method: "POST",
    body: formData
  });
  const uploadPayload = await parseJsonResponse(uploadResponse);
  assertOk(uploadResponse, uploadPayload, "Не удалось загрузить демо-версию");
  const demoId = uploadPayload?.id;
  if (!demoId) {
    throw new Error("API /api/audio-clips не вернул demo id.");
  }
  if (!uploadPayload?.audioStreamUrl) {
    throw new Error("API /api/audio-clips не вернул безопасный audioStreamUrl.");
  }
  if (typeof uploadPayload?.audioUrl === "string" && uploadPayload.audioUrl) {
    throw new Error("API /api/audio-clips продолжает светить raw audioUrl storage key.");
  }

  const uploadedDemoRecord = await prisma.demo.findUnique({
    where: { id: demoId },
    select: { audioUrl: true }
  });
  if (!uploadedDemoRecord?.audioUrl) {
    throw new Error("После загрузки не найден сохраненный private demo storage key.");
  }

  const ownerStreamResponse = await fetchWithCookies(`/api/audio-clips/${demoId}/stream`);
  if (!(ownerStreamResponse.ok || ownerStreamResponse.status === 302)) {
    const streamPayload = await parseJsonResponse(ownerStreamResponse);
    assertOk(ownerStreamResponse, streamPayload, "Owner path playback через /api/audio-clips/[id]/stream сломан");
  }

  const directPrivateUploadResponse = await fetch(`${baseUrl}/api/uploads/${uploadedDemoRecord.audioUrl}`, {
    redirect: "manual"
  });
  if (directPrivateUploadResponse.status !== 404) {
    throw new Error("Private demo unexpectedly доступно через /api/uploads.");
  }

  const wrapUpResponse = await fetchWithCookies("/api/home/wrap-up", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      trackId,
      focusId: focusPayload.id ?? null,
      endState: "READY_FOR_NEXT_STEP",
      whatChanged: "Сделал первую версию и сохранил контекст по ней",
      whatNotWorking: "Нужно проверить, что новый шаг закрепился у трека",
      nextStep: {
        text: "Отслушать демо и записать правки",
        reason: "Это должен быть единственный активный шаг после wrap-up"
      }
    })
  });
  const wrapUpPayload = await parseJsonResponse(wrapUpResponse);
  assertOk(wrapUpResponse, wrapUpPayload, "Не удалось завершить день");
  if (wrapUpPayload?.currentNextStep?.text !== "Отслушать демо и записать правки") {
    throw new Error("API /api/home/wrap-up не вернул новый активный следующий шаг.");
  }

  const overviewResponse = await fetchWithCookies("/api/home/overview");
  const overviewPayload = await parseJsonResponse(overviewResponse);
  assertOk(overviewResponse, overviewPayload, "Не удалось загрузить home overview");
  if (!overviewPayload?.dayLoop?.wrapUp?.nextStep?.text) {
    throw new Error("home/overview не содержит dayLoop.wrapUp.nextStep.");
  }

  const trackDetailResponse = await fetchWithCookies(`/api/songs/${trackId}`);
  const trackDetailPayload = await parseJsonResponse(trackDetailResponse);
  assertOk(trackDetailResponse, trackDetailPayload, "Не удалось загрузить детали трека");
  if (!trackDetailPayload?.workbenchState) {
    throw new Error("songs/[id] не вернул workbenchState.");
  }
  if (!trackDetailPayload?.activeNextStep?.text) {
    throw new Error("songs/[id] не вернул activeNextStep.");
  }
  const uploadedDemo = Array.isArray(trackDetailPayload?.demos) ? trackDetailPayload.demos.find((item) => item.id === demoId) : null;
  if (!uploadedDemo?.versionReflection?.whatChanged) {
    throw new Error("songs/[id] не вернул versionReflection для загруженной версии.");
  }
  if (!uploadedDemo?.audioStreamUrl) {
    throw new Error("songs/[id] не вернул audioStreamUrl для версии.");
  }
  if (typeof uploadedDemo?.audioUrl === "string" && uploadedDemo.audioUrl) {
    throw new Error("songs/[id] продолжает светить raw audioUrl.");
  }

  const communityProfileResponse = await fetchWithCookies(`/api/community/creators/${peerArtist.safeId}`);
  const communityProfilePayload = await parseJsonResponse(communityProfileResponse);
  assertOk(communityProfileResponse, communityProfilePayload, "Не удалось проверить creator profile redaction");
  if (communityProfilePayload?.supportProfile?.currentFocusTitle !== null) {
    throw new Error("Creator profile leaky: currentFocusTitle не отредактирован для чужого viewer.");
  }
  if (communityProfilePayload?.supportProfile?.seekingSupportDetail !== null) {
    throw new Error("Creator profile leaky: seekingSupportDetail не отредактирован для чужого viewer.");
  }
  if (communityProfilePayload?.derivedFocus !== null) {
    throw new Error("Creator profile leaky: derivedFocus не должен уходить чужому viewer.");
  }

  const ownedCommunityPostResponse = await fetchWithCookies("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "PROGRESS",
      title: "Smoke progress check",
      text: "Проверка owned refs",
      trackId,
      demoId
    })
  });
  const ownedCommunityPostPayload = await parseJsonResponse(ownedCommunityPostResponse);
  assertOk(ownedCommunityPostResponse, ownedCommunityPostPayload, "Не удалось создать community post с owned refs");

  const foreignTrackPostResponse = await fetchWithCookies("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "PROGRESS",
      title: "Smoke foreign track rejection",
      text: "Это должно отвалиться",
      trackId: peerArtist.trackId
    })
  });
  if (![400, 404].includes(foreignTrackPostResponse.status)) {
    const foreignTrackPayload = await parseJsonResponse(foreignTrackPostResponse);
    throw new Error(
      `Community post с foreign trackId не был отклонен как ожидалось (${foreignTrackPostResponse.status})${
        foreignTrackPayload?.error ? `: ${foreignTrackPayload.error}` : ""
      }`
    );
  }

  const mismatchTrack = await prisma.track.create({
    data: {
      userId: sessionPayload.user.id,
      title: `Smoke mismatch track ${titleSuffix}`,
      workbenchState: "IN_PROGRESS"
    },
    select: { id: true }
  });
  const mismatchDemo = await prisma.demo.create({
    data: {
      trackId: mismatchTrack.id,
      audioUrl: "private/demos/2026/03/19/smoke-mismatch-demo.wav",
      duration: 1,
      versionType: "DEMO",
      sortIndex: 0
    },
    select: { id: true }
  });

  const mismatchPostResponse = await fetchWithCookies("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind: "CREATIVE_QUESTION",
      title: "Smoke mismatch rejection",
      text: "Это должно отвалиться",
      trackId,
      demoId: mismatchDemo.id
    })
  });
  if (mismatchPostResponse.status !== 400) {
    const mismatchPayload = await parseJsonResponse(mismatchPostResponse);
    throw new Error(
      `Community post с mismatched trackId/demoId не дал ожидаемый 400 (${mismatchPostResponse.status})${
        mismatchPayload?.error ? `: ${mismatchPayload.error}` : ""
      }`
    );
  }

  const createRequestResponse = await fetchWithCookies("/api/requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "MIX_MASTER",
      specialistUserId,
      trackId,
      demoId,
      serviceLabel: "Сведение",
      brief: "Smoke request для проверки e2e потока",
      isRemote: true
    })
  });
  const createRequestPayload = await parseJsonResponse(createRequestResponse);
  assertOk(createRequestResponse, createRequestPayload, "Не удалось создать заявку в FIND");
  const requestId = createRequestPayload?.id;
  if (!requestId) {
    throw new Error("API /api/requests не вернул request id.");
  }

  const requestsListResponse = await fetchWithCookies("/api/requests?role=ARTIST");
  const requestsListPayload = await parseJsonResponse(requestsListResponse);
  assertOk(requestsListResponse, requestsListPayload, "Не удалось проверить список заявок");
  const listItems = Array.isArray(requestsListPayload?.items) ? requestsListPayload.items : [];
  const createdRequest = listItems.find((item) => item.id === requestId);
  if (!createdRequest) {
    throw new Error("Созданная заявка не найдена в /api/requests?role=ARTIST.");
  }

  await prisma.user.update({
    where: { email: artistEmail },
    data: { role: "SPECIALIST" }
  });
  try {
    const learnAccessResponse = await fetchWithCookies("/api/learn/context?surface=TODAY");
    if (learnAccessResponse.status !== 403) {
      const learnAccessPayload = await parseJsonResponse(learnAccessResponse);
      throw new Error(
        `Learn stale-session gating не сработал: ожидали 403, получили ${learnAccessResponse.status}${
          learnAccessPayload?.error ? `: ${learnAccessPayload.error}` : ""
        }`
      );
    }
  } finally {
    await prisma.user.update({
      where: { email: artistEmail },
      data: { role: "ARTIST" }
    });
  }

  console.log(
    `[e2e-smoke] success user=${sessionPayload.user.email} track=${trackId} demo=${demoId} request=${requestId} specialist=${specialistUserId} peerArtist=${peerArtist.userId}`
  );
}

run()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[e2e-smoke] failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
