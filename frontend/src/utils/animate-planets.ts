import { earthMoons } from '../planets/earth';
import { type PlanetPositionsRes, getRotationPeriod } from './get-planet-position';
import { jupiterMoons } from '../planets/jupiter';
import { marsMoons } from '../planets/mars';
import { neptuneMoons } from '../planets/neptune';
import { saturnMoons } from '../planets/saturn';
import {
  EARTH_ATMOSPHERE_ROTATION_OFFSET,
  EARTH_MOON_ORBITAL_PERIOD_DAYS,
  EARTH_MOON_ORBITAL_TILT,
  NEPTUNE_TILT,
  SATURN_TILT,
  URANUS_TILT,
  VENUS_ATMOSPHERE_ROTATION_MULTIPLIER,
  getStepDays,
  settings,
} from './settings';
import { uranusMoons } from '../planets/uranus';
import { degToRad } from './utils';
import type { AnimateContext, CachedMeshes } from '../types/scene-types';

/** 地球と月のアニメーション */
export function animateEarth(
  ctx: AnimateContext,
  meshes: CachedMeshes,
  posRes: PlanetPositionsRes,
): void {
  const { earthPlanetSystem, earthPlanet, earthAtmosphere, moon } = meshes;

  /* 地球の公転と自転（反時計回り） */
  {
    const earthPathLength = posRes.pathPoints.length - 1;
    const earthCurrentIndex = ctx.dayIndex % earthPathLength;
    const currentPosition = posRes.pathPoints[earthCurrentIndex];

    // 次の日（nextDayIndex）の座標を取得
    const nextDayIndex = (earthCurrentIndex + 1) % earthPathLength;
    const nextPosition = posRes.pathPoints[nextDayIndex];

    ctx.buf.copy(currentPosition).lerp(nextPosition, ctx.dayFraction);

    /* 地球の公転（反時計回り）*/
    earthPlanetSystem.position.copy(ctx.buf);

    // 地球は1日で360度するので1フレームあたりの回転量を計算
    const earthRotation = (360 / settings.lerpFrame) * settings.accelerationRotation;
    const earthAngle = degToRad(earthRotation);
    earthPlanet.rotateY(earthAngle);
    // 大気は少し早めに回転させる
    earthAtmosphere.rotateY(earthAngle + EARTH_ATMOSPHERE_ROTATION_OFFSET);
  }

  /* 月の公転と自転 */
  {
    const tiltAngle = degToRad(EARTH_MOON_ORBITAL_TILT);
    const periodDays = EARTH_MOON_ORBITAL_PERIOD_DAYS;
    // 公転周期をフレーム数に変換
    const periodFrames = periodDays * settings.lerpFrame;
    // 月は27.3日で360度公転するので1フレームあたりの回転量を計算
    const orbitSpeedFrame = degToRad((360 / periodFrames) * settings.accelerationOrbit);
    const currentAngle = ctx.frameCount * orbitSpeedFrame;
    // 月の公転（反時計回り）
    const { orbitRadius } = earthMoons[0]; // orbitRadius: 10
    const moonX = orbitRadius * Math.cos(currentAngle);
    const moonY = orbitRadius * Math.sin(currentAngle) * Math.sin(tiltAngle);
    const moonZ = orbitRadius * Math.sin(currentAngle) * Math.cos(tiltAngle);
    moon.position.set(-moonX, moonY, moonZ);
    // 月の自転は公転と同じ角速度で回転させる（地球から常に同じ面が見える同期自転のため）
    const rotationSpeedFrame = orbitSpeedFrame;
    moon.rotateY(rotationSpeedFrame);
  }
}

/** 水星の公転と自転（反時計回り） */
export function animateMercury(
  ctx: AnimateContext,
  meshes: CachedMeshes,
  posRes: PlanetPositionsRes,
): void {
  const { mercuryPlanetSystem, mercuryPlanet } = meshes;

  const mercuryPathLength = posRes.pathPoints.length - 1;
  const mercuryCurrentIndex = ctx.dayIndex % mercuryPathLength;
  const currentPosition = posRes.pathPoints[mercuryCurrentIndex];

  // 次の日（nextDayIndex）の座標を取得
  const nextDayIndex = (mercuryCurrentIndex + 1) % mercuryPathLength;
  const nextPosition = posRes.pathPoints[nextDayIndex];
  ctx.buf.copy(currentPosition).lerp(nextPosition, ctx.dayFraction);
  /* 水星の公転（反時計回り）*/
  mercuryPlanetSystem.position.copy(ctx.buf);

  // 水星の自転: 1フレームあたりの回転量を計算
  const mercuryRotation =
    (360 / (settings.lerpFrame * getRotationPeriod('MERCURY'))) * settings.accelerationRotation;
  const mercuryAngle = degToRad(mercuryRotation);
  mercuryPlanet.rotateY(mercuryAngle);
}

/** 金星の公転と自転（反時計回り） */
export function animateVenus(
  ctx: AnimateContext,
  meshes: CachedMeshes,
  posRes: PlanetPositionsRes,
): void {
  const { venusPlanetSystem, venusPlanet, venusAtmosphere } = meshes;

  const venusPathLength = posRes.pathPoints.length - 1;
  const venusCurrentIndex = ctx.dayIndex % venusPathLength;
  const currentPosition = posRes.pathPoints[venusCurrentIndex];

  // 次の日（nextDayIndex）の座標を取得
  const nextDayIndex = (venusCurrentIndex + 1) % venusPathLength;
  const nextPosition = posRes.pathPoints[nextDayIndex];
  ctx.buf.copy(currentPosition).lerp(nextPosition, ctx.dayFraction);
  /* 金星の公転（反時計回り）*/
  venusPlanetSystem.position.copy(ctx.buf);

  // 金星の自転: 1フレームあたりの回転量を計算（時計回りだがVENUS_TILTで回転させてる）
  const venusRotation =
    (360 / (settings.lerpFrame * getRotationPeriod('VENUS'))) * settings.accelerationRotation;
  const venusAngle = degToRad(venusRotation);
  venusPlanet.rotateY(venusAngle);
  // 大気はスーパーローテーションさせる（自転速度の約60倍で回転させる）
  venusAtmosphere.rotateY(venusAngle * VENUS_ATMOSPHERE_ROTATION_MULTIPLIER);
}

/** 火星と衛星（フォボス・ダイモス）の公転と自転（反時計回り） */
export function animateMars(
  ctx: AnimateContext,
  meshes: CachedMeshes,
  posRes: PlanetPositionsRes,
): void {
  const { marsPlanetSystem, marsPlanet, phobos, deimos } = meshes;

  const marsStepDays = getStepDays('MARS');
  const marsPathLength = posRes.pathPoints.length - 1;
  const earthDayProgress = ctx.dayIndex + ctx.dayFraction;
  const marsCurrentIndex = Math.floor(earthDayProgress / marsStepDays) % marsPathLength;
  const currentPosition = posRes.pathPoints[marsCurrentIndex];

  // 火星は5日刻みの点を使うため、次の点へは5日かけて補間する
  const nextDayIndex = (marsCurrentIndex + 1) % marsPathLength;
  const nextPosition = posRes.pathPoints[nextDayIndex];
  const marsLerpFactor = (earthDayProgress % marsStepDays) / marsStepDays;
  ctx.buf.copy(currentPosition).lerp(nextPosition, marsLerpFactor);
  /* 火星の公転（反時計回り）*/
  marsPlanetSystem.position.copy(ctx.buf);

  // 火星の自転: 1フレームあたりの回転量を計算
  const marsRotation =
    (360 / (settings.lerpFrame * getRotationPeriod('MARS'))) * settings.accelerationRotation;
  const marsAngle = degToRad(marsRotation);
  marsPlanet.rotateY(marsAngle);
  // フォボスとダイモスの公転（反時計回り）
  const phobosOrbitRadius = marsMoons[0].orbitRadius;
  const deimosOrbitRadius = marsMoons[1].orbitRadius;
  const phobosCurrentAngle = ctx.frameCount * settings.accelerationOrbit * 4.0; // フォボスは速い
  const deimosCurrentAngle = ctx.frameCount * settings.accelerationOrbit * 1.0; // ダイモスは標準
  // フォボスの公転
  const phobosX = phobosOrbitRadius * Math.cos(phobosCurrentAngle);
  const phobosY = 0; // 火星の赤道面に沿って公転させるため、Y軸は0に固定
  const phobosZ = phobosOrbitRadius * Math.sin(phobosCurrentAngle);
  phobos.position.set(-phobosX, phobosY, phobosZ);
  // ダイモスの公転
  const deimosX = deimosOrbitRadius * Math.cos(deimosCurrentAngle);
  const deimosY = 0; // 火星の赤道面に沿って公転させるため、Y軸は0に固定
  const deimosZ = deimosOrbitRadius * Math.sin(deimosCurrentAngle);
  deimos.position.set(-deimosX, deimosY, deimosZ);
}

/** 木星と衛星（イオ・エウロパ・ガニメデ・カリスト）の公転と自転（反時計回り） */
export function animateJupiter(
  ctx: AnimateContext,
  meshes: CachedMeshes,
  posRes: PlanetPositionsRes,
): void {
  const { jupiterPlanetSystem, jupiterPlanet, io, europa, ganymede, callisto } = meshes;

  const jupiterStepDays = getStepDays('JUPITER');
  const jupiterPathLength = posRes.pathPoints.length - 1;
  const earthDayProgress = ctx.dayIndex + ctx.dayFraction;
  const jupiterCurrentIndex = Math.floor(earthDayProgress / jupiterStepDays) % jupiterPathLength;
  const currentPosition = posRes.pathPoints[jupiterCurrentIndex];

  // 木星は30日刻みの点を使うため、次の点へは30日かけて補間する
  const nextDayIndex = (jupiterCurrentIndex + 1) % jupiterPathLength;
  const nextPosition = posRes.pathPoints[nextDayIndex];
  const jupiterLerpFactor = (earthDayProgress % jupiterStepDays) / jupiterStepDays;
  ctx.buf.copy(currentPosition).lerp(nextPosition, jupiterLerpFactor);
  /* 木星の公転（反時計回り）*/
  jupiterPlanetSystem.position.copy(ctx.buf);

  // 木星の自転: 1フレームあたりの回転量を計算
  const jupiterRotation =
    (360 / (settings.lerpFrame * getRotationPeriod('JUPITER'))) * settings.accelerationRotation;
  const jupiterAngle = degToRad(jupiterRotation);
  jupiterPlanet.rotateY(jupiterAngle);
  // 木星の衛星の公転
  {
    // イオは約1.8日、エウロパは約3.5日、ガニメデは約7.1日、カリストは約16.7日で木星を公転するので、それぞれの周期に応じた速度で公転させる
    const ioOrbitRadius = jupiterMoons[0].orbitRadius + (jupiterMoons[0].xPosition ?? 0);
    const europaOrbitRadius = jupiterMoons[1].orbitRadius + (jupiterMoons[1].xPosition ?? 0);
    const ganymedeOrbitRadius = jupiterMoons[2].orbitRadius + (jupiterMoons[2].xPosition ?? 0);
    const callistoOrbitRadius = jupiterMoons[3].orbitRadius + (jupiterMoons[3].xPosition ?? 0);
    const ioCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / jupiterMoons[0].orbitalPeriodDays);
    const europaCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / jupiterMoons[1].orbitalPeriodDays);
    const ganymedeCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / jupiterMoons[2].orbitalPeriodDays);
    const callistoCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / jupiterMoons[3].orbitalPeriodDays);
    // イオの公転
    const ioX = ioOrbitRadius * Math.cos(ioCurrentAngle);
    const ioY = 0; // 木星の赤道面に沿って公転させるため、Y軸は0に固定
    const ioZ = ioOrbitRadius * Math.sin(ioCurrentAngle);
    io.position.set(-ioX, ioY, ioZ);
    // エウロパの公転
    const europaX = europaOrbitRadius * Math.cos(europaCurrentAngle);
    const europaY = 0; // 木星の赤道面に沿って公転させるため、Y軸は0に固定
    const europaZ = europaOrbitRadius * Math.sin(europaCurrentAngle);
    europa.position.set(-europaX, europaY, europaZ);
    // ガニメデの公転
    const ganymedeX = ganymedeOrbitRadius * Math.cos(ganymedeCurrentAngle);
    const ganymedeY = 0; // 木星の赤道面に沿って公転させるため、Y軸は0に固定
    const ganymedeZ = ganymedeOrbitRadius * Math.sin(ganymedeCurrentAngle);
    ganymede.position.set(-ganymedeX, ganymedeY, ganymedeZ);
    // カリストの公転
    const callistoX = callistoOrbitRadius * Math.cos(callistoCurrentAngle);
    const callistoY = 0; // 木星の赤道面に沿って公転させるため、Y軸は0に固定
    const callistoZ = callistoOrbitRadius * Math.sin(callistoCurrentAngle);
    callisto.position.set(-callistoX, callistoY, callistoZ);
  }
}

/** 土星と衛星（タイタン・レア・イアペトゥス・ミマス・エンケラドゥス）の公転と自転（反時計回り） */
export function animateSaturn(
  ctx: AnimateContext,
  meshes: CachedMeshes,
  posRes: PlanetPositionsRes,
): void {
  const { saturnPlanetSystem, saturnPlanet, titan, rhea, iapetus, mimas, enceladus } = meshes;

  const saturnStepDays = getStepDays('SATURN');
  const saturnPathLength = posRes.pathPoints.length - 1;
  const earthDayProgress = ctx.dayIndex + ctx.dayFraction;
  const saturnCurrentIndex = Math.floor(earthDayProgress / saturnStepDays) % saturnPathLength;
  const currentPosition = posRes.pathPoints[saturnCurrentIndex];

  // 土星は90日刻みの点を使うため、次の点へは90日かけて補間する
  const nextDayIndex = (saturnCurrentIndex + 1) % saturnPathLength;
  const nextPosition = posRes.pathPoints[nextDayIndex];
  const saturnLerpFactor = (earthDayProgress % saturnStepDays) / saturnStepDays;
  ctx.buf.copy(currentPosition).lerp(nextPosition, saturnLerpFactor);
  saturnPlanetSystem.position.copy(ctx.buf);

  // 土星の自転: 1フレームあたりの回転量を計算
  const saturnRotation =
    (360 / (settings.lerpFrame * getRotationPeriod('SATURN'))) * settings.accelerationRotation;
  const saturnAngle = degToRad(saturnRotation);
  saturnPlanet.rotateY(saturnAngle);

  // 土星の衛星の公転
  {
    const saturnTiltAngle = degToRad(SATURN_TILT);

    // タイタンの公転（約15.95日）
    const titanOrbitRadius = saturnMoons[0].orbitRadius + (saturnMoons[0].xPosition ?? 0);
    const titanCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / saturnMoons[0].orbitalPeriodDays);
    const titanBaseX = -titanOrbitRadius * Math.cos(titanCurrentAngle);
    const titanBaseZ = titanOrbitRadius * Math.sin(titanCurrentAngle);
    const titanX = titanBaseX * Math.cos(saturnTiltAngle);
    const titanY = titanBaseX * Math.sin(saturnTiltAngle);
    titan.position.set(titanX, titanY, titanBaseZ);

    // レアの公転（約4.52日）
    const rheaOrbitRadius = saturnMoons[1].orbitRadius + (saturnMoons[1].xPosition ?? 0);
    const rheaCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / saturnMoons[1].orbitalPeriodDays);
    const rheaBaseX = -rheaOrbitRadius * Math.cos(rheaCurrentAngle);
    const rheaBaseZ = rheaOrbitRadius * Math.sin(rheaCurrentAngle);
    const rheaX = rheaBaseX * Math.cos(saturnTiltAngle);
    const rheaY = rheaBaseX * Math.sin(saturnTiltAngle);
    rhea.position.set(rheaX, rheaY, rheaBaseZ);

    // イアペトゥスの公転（約79.3日）
    const iapetusOrbitRadius = saturnMoons[2].orbitRadius + (saturnMoons[2].xPosition ?? 0);
    const iapetusCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / saturnMoons[2].orbitalPeriodDays);
    const iapetusBaseX = -iapetusOrbitRadius * Math.cos(iapetusCurrentAngle);
    const iapetusBaseZ = iapetusOrbitRadius * Math.sin(iapetusCurrentAngle);
    const iapetusX = iapetusBaseX * Math.cos(saturnTiltAngle);
    const iapetusY = iapetusBaseX * Math.sin(saturnTiltAngle);
    iapetus.position.set(iapetusX, iapetusY, iapetusBaseZ);

    // ミマスの公転（約0.942日）
    const mimasOrbitRadius = saturnMoons[3].orbitRadius + (saturnMoons[3].xPosition ?? 0);
    const mimasCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / saturnMoons[3].orbitalPeriodDays);
    const mimasBaseX = -mimasOrbitRadius * Math.cos(mimasCurrentAngle);
    const mimasBaseZ = mimasOrbitRadius * Math.sin(mimasCurrentAngle);
    const mimasX = mimasBaseX * Math.cos(saturnTiltAngle);
    const mimasY = mimasBaseX * Math.sin(saturnTiltAngle);
    mimas.position.set(mimasX, mimasY, mimasBaseZ);

    // エンケラドゥスの公転（約1.37日）
    const enceladusOrbitRadius = saturnMoons[4].orbitRadius + (saturnMoons[4].xPosition ?? 0);
    const enceladusCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / saturnMoons[4].orbitalPeriodDays);
    const enceladusBaseX = -enceladusOrbitRadius * Math.cos(enceladusCurrentAngle);
    const enceladusBaseZ = enceladusOrbitRadius * Math.sin(enceladusCurrentAngle);
    const enceladusX = enceladusBaseX * Math.cos(saturnTiltAngle);
    const enceladusY = enceladusBaseX * Math.sin(saturnTiltAngle);
    enceladus.position.set(enceladusX, enceladusY, enceladusBaseZ);
  }
}

/** 天王星と衛星（ミランダ・アリエル・アンブリエル・ティタニア・オベロン）の公転と自転（反時計回り） */
export function animateUranus(
  ctx: AnimateContext,
  meshes: CachedMeshes,
  posRes: PlanetPositionsRes,
): void {
  const { uranusPlanetSystem, uranusPlanet, miranda, ariel, umbriel, titania, oberon } = meshes;

  const uranusStepDays = getStepDays('URANUS');
  const uranusPathLength = posRes.pathPoints.length - 1;
  const earthDayProgress = ctx.dayIndex + ctx.dayFraction;
  const uranusCurrentIndex = Math.floor(earthDayProgress / uranusStepDays) % uranusPathLength;
  const currentPosition = posRes.pathPoints[uranusCurrentIndex];

  // 天王星は120日刻みの点を使うため、次の点へは120日かけて補間する
  const nextDayIndex = (uranusCurrentIndex + 1) % uranusPathLength;
  const nextPosition = posRes.pathPoints[nextDayIndex];
  const uranusLerpFactor = (earthDayProgress % uranusStepDays) / uranusStepDays;
  ctx.buf.copy(currentPosition).lerp(nextPosition, uranusLerpFactor);
  uranusPlanetSystem.position.copy(ctx.buf);

  // 天王星の自転: 1フレームあたりの回転量を計算
  const uranusRotation =
    (360 / (settings.lerpFrame * getRotationPeriod('URANUS'))) * settings.accelerationRotation;
  const uranusAngle = degToRad(uranusRotation);
  uranusPlanet.rotateY(uranusAngle);

  // 天王星の衛星の公転
  {
    const uranusTiltAngle = degToRad(URANUS_TILT);

    // Mirandaの公転（約1.41日）
    const mirandaOrbitRadius = uranusMoons[0].orbitRadius + (uranusMoons[0].xPosition ?? 0);
    const mirandaCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / uranusMoons[0].orbitalPeriodDays);
    const mirandaBaseX = -mirandaOrbitRadius * Math.cos(mirandaCurrentAngle);
    const mirandaBaseZ = mirandaOrbitRadius * Math.sin(mirandaCurrentAngle);
    const mirandaX = mirandaBaseX * Math.cos(uranusTiltAngle);
    const mirandaY = mirandaBaseX * Math.sin(uranusTiltAngle);
    miranda.position.set(mirandaX, mirandaY, mirandaBaseZ);

    // Arielの公転（約2.52日）
    const arielOrbitRadius = uranusMoons[1].orbitRadius + (uranusMoons[1].xPosition ?? 0);
    const arielCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / uranusMoons[1].orbitalPeriodDays);
    const arielBaseX = -arielOrbitRadius * Math.cos(arielCurrentAngle);
    const arielBaseZ = arielOrbitRadius * Math.sin(arielCurrentAngle);
    const arielX = arielBaseX * Math.cos(uranusTiltAngle);
    const arielY = arielBaseX * Math.sin(uranusTiltAngle);
    ariel.position.set(arielX, arielY, arielBaseZ);

    // Umbrielの公転（約4.14日）
    const umbrielOrbitRadius = uranusMoons[2].orbitRadius + (uranusMoons[2].xPosition ?? 0);
    const umbrielCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / uranusMoons[2].orbitalPeriodDays);
    const umbrielBaseX = -umbrielOrbitRadius * Math.cos(umbrielCurrentAngle);
    const umbrielBaseZ = umbrielOrbitRadius * Math.sin(umbrielCurrentAngle);
    const umbrielX = umbrielBaseX * Math.cos(uranusTiltAngle);
    const umbrielY = umbrielBaseX * Math.sin(uranusTiltAngle);
    umbriel.position.set(umbrielX, umbrielY, umbrielBaseZ);

    // Titaniaの公転（約8.71日）
    const titaniaOrbitRadius = uranusMoons[3].orbitRadius + (uranusMoons[3].xPosition ?? 0);
    const titaniaCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / uranusMoons[3].orbitalPeriodDays);
    const titaniaBaseX = -titaniaOrbitRadius * Math.cos(titaniaCurrentAngle);
    const titaniaBaseZ = titaniaOrbitRadius * Math.sin(titaniaCurrentAngle);
    const titaniaX = titaniaBaseX * Math.cos(uranusTiltAngle);
    const titaniaY = titaniaBaseX * Math.sin(uranusTiltAngle);
    titania.position.set(titaniaX, titaniaY, titaniaBaseZ);

    // Oberonの公転（約13.46日）
    const oberonOrbitRadius = uranusMoons[4].orbitRadius + (uranusMoons[4].xPosition ?? 0);
    const oberonCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / uranusMoons[4].orbitalPeriodDays);
    const oberonBaseX = -oberonOrbitRadius * Math.cos(oberonCurrentAngle);
    const oberonBaseZ = oberonOrbitRadius * Math.sin(oberonCurrentAngle);
    const oberonX = oberonBaseX * Math.cos(uranusTiltAngle);
    const oberonY = oberonBaseX * Math.sin(uranusTiltAngle);
    oberon.position.set(oberonX, oberonY, oberonBaseZ);
  }
}

/** 海王星と衛星（トリトン・プロテウス・ネレイド）の公転と自転（反時計回り） */
export function animateNeptune(
  ctx: AnimateContext,
  meshes: CachedMeshes,
  posRes: PlanetPositionsRes,
): void {
  const { neptunePlanetSystem, neptunePlanet, triton, proteus, nereid } = meshes;

  const neptuneStepDays = getStepDays('NEPTUNE');
  const neptunePathLength = posRes.pathPoints.length - 1;
  const earthDayProgress = ctx.dayIndex + ctx.dayFraction;
  const neptuneCurrentIndex = Math.floor(earthDayProgress / neptuneStepDays) % neptunePathLength;
  const currentPosition = posRes.pathPoints[neptuneCurrentIndex];

  // 海王星は180日刻みの点を使うため、次の点へは180日かけて補間する
  const nextDayIndex = (neptuneCurrentIndex + 1) % neptunePathLength;
  const nextPosition = posRes.pathPoints[nextDayIndex];
  const neptuneLerpFactor = (earthDayProgress % neptuneStepDays) / neptuneStepDays;
  ctx.buf.copy(currentPosition).lerp(nextPosition, neptuneLerpFactor);
  neptunePlanetSystem.position.copy(ctx.buf);

  // 海王星の自転: 1フレームあたりの回転量を計算
  const neptuneRotation =
    (360 / (settings.lerpFrame * getRotationPeriod('NEPTUNE'))) * settings.accelerationRotation;
  const neptuneAngle = degToRad(neptuneRotation);
  neptunePlanet.rotateY(neptuneAngle);

  // 海王星の衛星の公転
  {
    const neptuneTiltAngle = degToRad(NEPTUNE_TILT);

    // Tritonの公転（約5.88日）
    // トリトンは太陽系の主要衛星では珍しい逆行衛星
    const tritonOrbitRadius = neptuneMoons[0].orbitRadius + (neptuneMoons[0].xPosition ?? 0);
    const tritonDirection = neptuneMoons[0].retrograde ? -1 : 1;
    const tritonCurrentAngle =
      tritonDirection *
      ctx.frameCount *
      settings.accelerationOrbit *
      (1 / neptuneMoons[0].orbitalPeriodDays);
    const tritonBaseX = -tritonOrbitRadius * Math.cos(tritonCurrentAngle);
    const tritonBaseZ = tritonOrbitRadius * Math.sin(tritonCurrentAngle);
    const tritonX = tritonBaseX * Math.cos(neptuneTiltAngle);
    const tritonY = tritonBaseX * Math.sin(neptuneTiltAngle);
    triton.position.set(tritonX, tritonY, tritonBaseZ);

    // Proteusの公転（約1.12日）
    const proteusOrbitRadius = neptuneMoons[1].orbitRadius + (neptuneMoons[1].xPosition ?? 0);
    const proteusCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / neptuneMoons[1].orbitalPeriodDays);
    const proteusBaseX = -proteusOrbitRadius * Math.cos(proteusCurrentAngle);
    const proteusBaseZ = proteusOrbitRadius * Math.sin(proteusCurrentAngle);
    const proteusX = proteusBaseX * Math.cos(neptuneTiltAngle);
    const proteusY = proteusBaseX * Math.sin(neptuneTiltAngle);
    proteus.position.set(proteusX, proteusY, proteusBaseZ);

    // Nereidの公転（約360.14日）
    const nereidOrbitRadius = neptuneMoons[2].orbitRadius + (neptuneMoons[2].xPosition ?? 0);
    const nereidCurrentAngle =
      ctx.frameCount * settings.accelerationOrbit * (1 / neptuneMoons[2].orbitalPeriodDays);
    const nereidBaseX = -nereidOrbitRadius * Math.cos(nereidCurrentAngle);
    const nereidBaseZ = nereidOrbitRadius * Math.sin(nereidCurrentAngle);
    const nereidX = nereidBaseX * Math.cos(neptuneTiltAngle);
    const nereidY = nereidBaseX * Math.sin(neptuneTiltAngle);
    nereid.position.set(nereidX, nereidY, nereidBaseZ);
  }
}
