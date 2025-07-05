
struct Uniforms {
    opacity : f32,
    useSkyboxTexture:u32,
    blur:f32,
    transitionDuration:f32,
    transitionElapsed:f32,
    useTransitionAlphaTexture:u32
};
@group(2) @binding(0) var<uniform> uniforms : Uniforms;
@group(2) @binding(1) var skyboxTextureSampler: sampler;
@group(2) @binding(2) var skyboxTexture: texture_cube<f32>;
@group(2) @binding(3) var transitionTexture: texture_cube<f32>;
@group(2) @binding(4) var transitionAlphaTexture: texture_2d<f32>;

struct InputData {
    @location(0) vertexPosition : vec4<f32>,
};
// 🌐 큐브맵 방향 벡터를 구면 UV 좌표로 변환하는 함수
fn sphericalToUV(dir: vec3<f32>) -> vec2<f32> {
    let normalizedDir = normalize(dir);
    let phi = atan2(normalizedDir.z, normalizedDir.x);
    let theta = acos(clamp(normalizedDir.y, -1.0, 1.0));

    let u = (phi + 3.14159265359) / (2.0 * 3.14159265359);
    let v = theta / 3.14159265359;

    return vec2<f32>(u, v);
}

@fragment
fn main(inputData:InputData) -> @location(0) vec4<f32> {
  var cubemapVec = inputData.vertexPosition.xyz - vec3<f32>(0.5);
  let mipmapCount:f32 = f32(textureNumLevels(skyboxTexture) - 1);
  let blurCurve = uniforms.blur * uniforms.blur; // 제곱 곡선
  let skyboxColor = textureSampleLevel(skyboxTexture, skyboxTextureSampler, cubemapVec, mipmapCount * blurCurve);
  var sampleColor = skyboxColor;
  if(uniforms.transitionDuration > uniforms.transitionElapsed){
    let transitionRatio = clamp(uniforms.transitionElapsed / uniforms.transitionDuration, 0.0, 1.0);

    if(uniforms.useTransitionAlphaTexture == 1u){
        // 2D 텍스처 기반 트랜지션

        let transitionColor = textureSampleLevel(transitionTexture, skyboxTextureSampler, cubemapVec, mipmapCount * blurCurve);

        // 큐브맵 벡터를 2D UV 좌표로 변환
        let uv = sphericalToUV(normalize(cubemapVec));

        // 2D 텍스처 샘플링
        let transitionSample = textureSampleLevel(transitionAlphaTexture, skyboxTextureSampler, uv, 0.0);
        let transitionValue = dot(transitionSample.rgb, vec3<f32>(0.299, 0.587, 0.114));

        // 노이즈 기반 트랜지션 마스크 생성
        let threshold = transitionRatio;
        let noiseInfluence = 0.3;
        let edgeSoftness = 0.1;

        let maskValue = smoothstep(
            threshold - edgeSoftness,
            threshold + edgeSoftness,
            transitionValue + (transitionRatio - 0.5) * noiseInfluence
        );

        sampleColor = mix(transitionColor, skyboxColor, maskValue * (1.0 - transitionRatio)) ;

    }else{
        sampleColor = mix(
            skyboxColor,
            textureSampleLevel(transitionTexture,skyboxTextureSampler, cubemapVec, mipmapCount * blurCurve),
            transitionRatio
        );
    }
  }

  var outColor = vec4<f32>(sampleColor.rgb, sampleColor.a * uniforms.opacity);
  if(outColor.a == 0.0) {
    discard;
  }
  return outColor;
}
