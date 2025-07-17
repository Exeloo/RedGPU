fn calcDisplacementPosition(input_position:vec3<f32>, input_vertexNormal:vec3<f32>,displacementTexture:texture_2d<f32>, displacementTextureSampler:sampler, displacementScale:f32,input_uv:vec2<f32>, mipLevel:f32) -> vec3<f32> {
    let displacementSample = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv, mipLevel).r;
    let scaledDisplacement = (displacementSample - 0.5) * displacementScale;
    let displacedPosition = input_position + input_vertexNormal * scaledDisplacement;
    return displacedPosition;
}
fn calcDisplacementNormal(
    input_vertexNormal: vec3<f32>,
    displacementTexture: texture_2d<f32>,
    displacementTextureSampler: sampler,
    displacementScale: f32,
    input_uv: vec2<f32>,
    mipLevel: f32
) -> vec3<f32> {
    // 🎯 텍스처 해상도 기반 적응형 오프셋
    let textureDimensions = vec2<f32>(textureDimensions(displacementTexture, 0));
    let adaptiveOffset = vec2<f32>(1.0) / textureDimensions;  // 1픽셀 단위

    // 🌊 거리에 따른 MIP 레벨 사용 (고정하지 않음)
    let actualMipLevel = mipLevel;

    // 🎯 중앙값과 주변 샘플
    let center = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv, actualMipLevel).r;
    let left = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv - vec2<f32>(adaptiveOffset.x, 0.0), actualMipLevel).r;
    let right = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv + vec2<f32>(adaptiveOffset.x, 0.0), actualMipLevel).r;
    let down = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv - vec2<f32>(0.0, adaptiveOffset.y), actualMipLevel).r;
    let up = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv + vec2<f32>(0.0, adaptiveOffset.y), actualMipLevel).r;

    // 🌊 개선된 그라디언트 계산 (중앙 차분법)
    let ddx = ((right - 0.5) - (left - 0.5)) * displacementScale / (2.0 * adaptiveOffset.x);
    let ddy = ((up - 0.5) - (down - 0.5)) * displacementScale / (2.0 * adaptiveOffset.y);

    // 🎯 탄젠트 공간 노멀 생성
    let tangentSpaceNormal = normalize(vec3<f32>(-ddx, -ddy, 1.0));

    // 🌊 월드 공간으로 변환 (더 부드러운 블렌딩)
    let worldNormal = normalize(input_vertexNormal);

    // 🎯 적응형 강도 조절 (거리에 따라 약화)
    let normalStrength = clamp(1.0 - mipLevel * 0.1, 0.2, 1.0);

    // 🌊 부드러운 노멀 블렌딩
    let blendedNormal = normalize(mix(worldNormal, tangentSpaceNormal, normalStrength * 0.3));

    return blendedNormal;
}



fn calcDisplacementWaterNormal(
    input_vertexNormal: vec3<f32>,
    displacementTexture: texture_2d<f32>,
    displacementTextureSampler: sampler,
    displacementScale: f32,
    input_uv: vec2<f32>,
    mipLevel: f32
) -> vec3<f32> {
    // 🌊 displacement 텍스처에서 모든 정보 샘플링
    let displacementData = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv, mipLevel);

    // 🎯 채널별 정보 추출
    let heightValue = displacementData.r;           // 높이 정보
    let foamValue = displacementData.g;             // 거품 정보
    let normalX = (displacementData.b - 0.5) * 2.0; // 노멀 X (0~1 -> -1~1)
    let normalY = (displacementData.a - 0.5) * 2.0; // 노멀 Y (0~1 -> -1~1)

    // 🌊 미리 계산된 노멀 사용 (더 정확함)
    let precomputedNormal = vec3<f32>(normalX, normalY, 1.0);
    let tangentSpaceNormal = normalize(precomputedNormal);

    // 🎯 fallback으로 높이 기반 노멀 계산도 유지
    let textureDimensions = vec2<f32>(textureDimensions(displacementTexture, 0));
    let adaptiveOffset = vec2<f32>(1.0) / textureDimensions;

    let center = heightValue;
    let left = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv - vec2<f32>(adaptiveOffset.x, 0.0), mipLevel).r;
    let right = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv + vec2<f32>(adaptiveOffset.x, 0.0), mipLevel).r;
    let down = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv - vec2<f32>(0.0, adaptiveOffset.y), mipLevel).r;
    let up = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv + vec2<f32>(0.0, adaptiveOffset.y), mipLevel).r;

    let ddx = ((right - 0.5) - (left - 0.5)) * displacementScale / (2.0 * adaptiveOffset.x);
    let ddy = ((up - 0.5) - (down - 0.5)) * displacementScale / (2.0 * adaptiveOffset.y);
    let fallbackNormal = normalize(vec3<f32>(-ddx, -ddy, 1.0));

    // 🌊 미리 계산된 노멀과 fallback 노멀 혼합
    let normalStrength = clamp(1.0 - mipLevel * 0.1, 0.2, 1.0);
    let blendFactor = 0.8; // 미리 계산된 노멀에 더 많은 가중치

    let finalTangentNormal = mix(fallbackNormal, tangentSpaceNormal, blendFactor);

    // 🎯 월드 공간으로 변환
    let worldNormal = normalize(input_vertexNormal);
    let blendedNormal = normalize(mix(worldNormal, finalTangentNormal, normalStrength * 0.5));

    return blendedNormal;
}

// 🌊 거품 정보 추출 함수 (필요시 사용)
fn calcDisplacementWaterFoam(
    displacementTexture: texture_2d<f32>,
    displacementTextureSampler: sampler,
    input_uv: vec2<f32>,
    mipLevel: f32
) -> f32 {
    let displacementData = textureSampleLevel(displacementTexture, displacementTextureSampler, input_uv, mipLevel);
    return displacementData.g; // G 채널에서 거품 정보 추출
}
