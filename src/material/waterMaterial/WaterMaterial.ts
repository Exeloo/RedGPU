import ColorRGB from "../../color/ColorRGB";
import RedGPUContext from "../../context/RedGPUContext";
import DefineForFragment from "../../resources/defineProperty/DefineForFragment";
import parseWGSL from "../../resources/wgslParser/parseWGSL";
import ABitmapBaseMaterial from "../core/ABitmapBaseMaterial";
import fragmentModuleSource from './fragment.wgsl'
import WaterTexture from "./texture/WaterTexture";

const SHADER_INFO = parseWGSL(fragmentModuleSource)

// 🌊 WaterTexture 설정 인터페이스
export interface WaterTextureSettings {
	// Wave 1
	amplitude1: number;
	wavelength1: number;
	speed1: number;
	steepness1: number;
	direction1: number[];

	// Wave 2
	amplitude2: number;
	wavelength2: number;
	speed2: number;
	steepness2: number;
	direction2: number[];

	// Wave 3
	amplitude3: number;
	wavelength3: number;
	speed3: number;
	steepness3: number;
	direction3: number[];

	// Wave 4
	amplitude4: number;
	wavelength4: number;
	speed4: number;
	steepness4: number;
	direction4: number[];

	// Detail noise
	detailScale1: number;
	detailSpeed1: number;
	detailStrength1: number;
	detailScale2: number;
	detailSpeed2: number;
	detailStrength2: number;

	// Global settings
	waveRange: number;
	foamThreshold: number;
	normalOffset: number;
	normalStrength: number;

	// Randomization
	seed: number;
	noiseScale: number;
}

// 🌊 전체 WaterSettings 구조
export interface WaterSettings {
	displacementTexture: WaterTextureSettings;
	opacity: number;
	waterIOR: number;
	waterColor: string; // HEX 색상
	waterColorStrength: number;
}

// 프리셋 타입들
export type WaterPreset = Partial<{
	displacementTexture: Partial<WaterTextureSettings>;
	opacity: number;
	waterIOR: number;
	waterColor: string;
	waterColorStrength: number;
}>;

const WaterPresets = {
	calmOcean: {
		displacementTexture: {
			amplitude1: 0.3, wavelength1: 8.0, speed1: 0.8, steepness1: 0.2, direction1: [1.0, 0.0],
			amplitude2: 0.2, wavelength2: 6.0, speed2: 0.6, steepness2: 0.15, direction2: [0.7, 0.7],
			amplitude3: 0.1, wavelength3: 4.0, speed3: 1.0, steepness3: 0.1, direction3: [0.0, 1.0],
			amplitude4: 0.05, wavelength4: 2.0, speed4: 1.2, steepness4: 0.05, direction4: [-0.7, 0.7],
			detailScale1: 4.0, detailSpeed1: 0.3, detailStrength1: 0.04,
			detailScale2: 8.0, detailSpeed2: 0.2, detailStrength2: 0.02,
			waveRange: 1.0, foamThreshold: 0.8,
			normalOffset: 0.01, normalStrength: 1.0,
			seed: 42.0, noiseScale: 0.8
		},
		opacity: 0.6,
		waterIOR: 1.333,
		waterColor: '#4A90E2',
		waterColorStrength: 0.7
	} as WaterPreset,

	stormyOcean: {
		displacementTexture: {
			amplitude1: 1.5, wavelength1: 15.0, speed1: 2.0, steepness1: 0.8, direction1: [1.0, 0.0],
			amplitude2: 1.0, wavelength2: 10.0, speed2: 1.8, steepness2: 0.6, direction2: [0.8, 0.6],
			amplitude3: 0.8, wavelength3: 6.0, speed3: 2.5, steepness3: 0.4, direction3: [0.0, 1.0],
			amplitude4: 0.6, wavelength4: 3.0, speed4: 3.0, steepness4: 0.3, direction4: [-0.6, 0.8],
			detailScale1: 8.0, detailSpeed1: 0.8, detailStrength1: 0.12,
			detailScale2: 16.0, detailSpeed2: 0.6, detailStrength2: 0.08,
			waveRange: 3.0, foamThreshold: 0.5,
			normalOffset: 0.008, normalStrength: 1.2,
			seed: 123.0, noiseScale: 1.5
		},
		opacity: 0.4,
		waterIOR: 1.333,
		waterColor: '#2E4F6B',
		waterColorStrength: 0.9
	} as WaterPreset,

	gentleWaves: {
		displacementTexture: {
			amplitude1: 0.6, wavelength1: 6.0, speed1: 1.0, steepness1: 0.4, direction1: [1.0, 0.0],
			amplitude2: 0.4, wavelength2: 4.5, speed2: 0.8, steepness2: 0.3, direction2: [0.7, 0.7],
			amplitude3: 0.2, wavelength3: 3.0, speed3: 1.2, steepness3: 0.2, direction3: [0.0, 1.0],
			amplitude4: 0.1, wavelength4: 1.8, speed4: 1.5, steepness4: 0.1, direction4: [-0.7, 0.7],
			detailScale1: 6.0, detailSpeed1: 0.5, detailStrength1: 0.08,
			detailScale2: 12.0, detailSpeed2: 0.3, detailStrength2: 0.04,
			waveRange: 1.5, foamThreshold: 0.75,
			normalOffset: 0.01, normalStrength: 1.0,
			seed: 256.0, noiseScale: 1.0
		},
		opacity: 0.5,
		waterIOR: 1.333,
		waterColor: '#87CEEB',
		waterColorStrength: 0.6
	} as WaterPreset,

	lakeRipples: {
		displacementTexture: {
			amplitude1: 0.2, wavelength1: 3.0, speed1: 0.5, steepness1: 0.1, direction1: [1.0, 0.0],
			amplitude2: 0.15, wavelength2: 2.2, speed2: 0.4, steepness2: 0.08, direction2: [0.6, 0.8],
			amplitude3: 0.1, wavelength3: 1.5, speed3: 0.6, steepness3: 0.05, direction3: [0.0, 1.0],
			amplitude4: 0.05, wavelength4: 1.0, speed4: 0.8, steepness4: 0.02, direction4: [-0.8, 0.6],
			detailScale1: 12.0, detailSpeed1: 0.2, detailStrength1: 0.025,
			detailScale2: 20.0, detailSpeed2: 0.15, detailStrength2: 0.012,
			waveRange: 0.8, foamThreshold: 0.9,
			normalOffset: 0.012, normalStrength: 0.8,
			seed: 512.0, noiseScale: 0.6
		},
		opacity: 0.7,
		waterIOR: 1.333,
		waterColor: '#6BB6FF',
		waterColorStrength: 0.5
	} as WaterPreset
};

interface WaterMaterial {
	opacity: number;
	waterIOR: number;
	waterColor: ColorRGB;
	waterColorStrength: number;
	use2PathRender: boolean
}

class WaterMaterial extends ABitmapBaseMaterial {
	static WaterPresets = WaterPresets
	#displacementTexture: WaterTexture
	#displacementScale: number = 1

	get displacementScale(): number {
		return this.#displacementScale;
	}

	set displacementScale(value: number) {
		this.#displacementScale = value;
	}

	get displacementTexture(): WaterTexture {
		return this.#displacementTexture;
	}

	set displacementTexture(value: WaterTexture) {
		const prevTexture: WaterTexture = this.#displacementTexture
		this.#displacementTexture = value;
		this.updateTexture(prevTexture, value)
		this.dirtyPipeline = true
	}

	get useDisplacementTextureNormal(): boolean {
		return true
	}

	// 🌊 Wave 1 Properties
	get amplitude1(): number {
		return this.#displacementTexture.getProperty('amplitude1') as number;
	}

	set amplitude1(value: number) {
		this.#displacementTexture.setProperty('amplitude1', value);
	}

	get wavelength1(): number {
		return this.#displacementTexture.getProperty('wavelength1') as number;
	}

	set wavelength1(value: number) {
		this.#displacementTexture.setProperty('wavelength1', value);
	}

	get speed1(): number {
		return this.#displacementTexture.getProperty('speed1') as number;
	}

	set speed1(value: number) {
		this.#displacementTexture.setProperty('speed1', value);
	}

	get steepness1(): number {
		return this.#displacementTexture.getProperty('steepness1') as number;
	}

	set steepness1(value: number) {
		this.#displacementTexture.setProperty('steepness1', value);
	}

	get direction1(): number[] {
		return this.#displacementTexture.getProperty('direction1') as number[];
	}

	set direction1(value: number[]) {
		this.#displacementTexture.setProperty('direction1', value);
	}

	// 🌊 Wave 2 Properties
	get amplitude2(): number {
		return this.#displacementTexture.getProperty('amplitude2') as number;
	}

	set amplitude2(value: number) {
		this.#displacementTexture.setProperty('amplitude2', value);
	}

	get wavelength2(): number {
		return this.#displacementTexture.getProperty('wavelength2') as number;
	}

	set wavelength2(value: number) {
		this.#displacementTexture.setProperty('wavelength2', value);
	}

	get speed2(): number {
		return this.#displacementTexture.getProperty('speed2') as number;
	}

	set speed2(value: number) {
		this.#displacementTexture.setProperty('speed2', value);
	}

	get steepness2(): number {
		return this.#displacementTexture.getProperty('steepness2') as number;
	}

	set steepness2(value: number) {
		this.#displacementTexture.setProperty('steepness2', value);
	}

	get direction2(): number[] {
		return this.#displacementTexture.getProperty('direction2') as number[];
	}

	set direction2(value: number[]) {
		this.#displacementTexture.setProperty('direction2', value);
	}

	// 🌊 Wave 3 Properties
	get amplitude3(): number {
		return this.#displacementTexture.getProperty('amplitude3') as number;
	}

	set amplitude3(value: number) {
		this.#displacementTexture.setProperty('amplitude3', value);
	}

	get wavelength3(): number {
		return this.#displacementTexture.getProperty('wavelength3') as number;
	}

	set wavelength3(value: number) {
		this.#displacementTexture.setProperty('wavelength3', value);
	}

	get speed3(): number {
		return this.#displacementTexture.getProperty('speed3') as number;
	}

	set speed3(value: number) {
		this.#displacementTexture.setProperty('speed3', value);
	}

	get steepness3(): number {
		return this.#displacementTexture.getProperty('steepness3') as number;
	}

	set steepness3(value: number) {
		this.#displacementTexture.setProperty('steepness3', value);
	}

	get direction3(): number[] {
		return this.#displacementTexture.getProperty('direction3') as number[];
	}

	set direction3(value: number[]) {
		this.#displacementTexture.setProperty('direction3', value);
	}

	// 🌊 Wave 4 Properties
	get amplitude4(): number {
		return this.#displacementTexture.getProperty('amplitude4') as number;
	}

	set amplitude4(value: number) {
		this.#displacementTexture.setProperty('amplitude4', value);
	}

	get wavelength4(): number {
		return this.#displacementTexture.getProperty('wavelength4') as number;
	}

	set wavelength4(value: number) {
		this.#displacementTexture.setProperty('wavelength4', value);
	}

	get speed4(): number {
		return this.#displacementTexture.getProperty('speed4') as number;
	}

	set speed4(value: number) {
		this.#displacementTexture.setProperty('speed4', value);
	}

	get steepness4(): number {
		return this.#displacementTexture.getProperty('steepness4') as number;
	}

	set steepness4(value: number) {
		this.#displacementTexture.setProperty('steepness4', value);
	}

	get direction4(): number[] {
		return this.#displacementTexture.getProperty('direction4') as number[];
	}

	set direction4(value: number[]) {
		this.#displacementTexture.setProperty('direction4', value);
	}

	// 🎯 Detail Properties
	get detailScale1(): number {
		return this.#displacementTexture.getProperty('detailScale1') as number;
	}

	set detailScale1(value: number) {
		this.#displacementTexture.setProperty('detailScale1', value);
	}

	get detailSpeed1(): number {
		return this.#displacementTexture.getProperty('detailSpeed1') as number;
	}

	set detailSpeed1(value: number) {
		this.#displacementTexture.setProperty('detailSpeed1', value);
	}

	get detailStrength1(): number {
		return this.#displacementTexture.getProperty('detailStrength1') as number;
	}

	set detailStrength1(value: number) {
		this.#displacementTexture.setProperty('detailStrength1', value);
	}

	get detailScale2(): number {
		return this.#displacementTexture.getProperty('detailScale2') as number;
	}

	set detailScale2(value: number) {
		this.#displacementTexture.setProperty('detailScale2', value);
	}

	get detailSpeed2(): number {
		return this.#displacementTexture.getProperty('detailSpeed2') as number;
	}

	set detailSpeed2(value: number) {
		this.#displacementTexture.setProperty('detailSpeed2', value);
	}

	get detailStrength2(): number {
		return this.#displacementTexture.getProperty('detailStrength2') as number;
	}

	set detailStrength2(value: number) {
		this.#displacementTexture.setProperty('detailStrength2', value);
	}

	// 🌊 Global Properties
	get waveRange(): number {
		return this.#displacementTexture.getProperty('waveRange') as number;
	}

	set waveRange(value: number) {
		this.#displacementTexture.setProperty('waveRange', value);
	}

	get foamThreshold(): number {
		return this.#displacementTexture.getProperty('foamThreshold') as number;
	}

	set foamThreshold(value: number) {
		this.#displacementTexture.setProperty('foamThreshold', value);
	}

	// 🎯 Normal Properties
	get normalOffset(): number {
		return this.#displacementTexture.getProperty('normalOffset') as number;
	}

	set normalOffset(value: number) {
		this.#displacementTexture.setProperty('normalOffset', value);
	}

	get normalStrength(): number {
		return this.#displacementTexture.getProperty('normalStrength') as number;
	}

	set normalStrength(value: number) {
		this.#displacementTexture.setProperty('normalStrength', value);
	}

	// 🎯 Randomization Properties
	get seed(): number {
		return this.#displacementTexture.getProperty('seed') as number;
	}

	set seed(value: number) {
		this.#displacementTexture.setProperty('seed', value);
	}

	get noiseScale(): number {
		return this.#displacementTexture.frequency;
	}

	set noiseScale(value: number) {
		this.#displacementTexture.updateUniform('frequency', value)
	}

	constructor(redGPUContext: RedGPUContext, color: string = '#20B2AA', name?: string) {
		super(
			redGPUContext,
			'WATER_MATERIAL',
			SHADER_INFO,
			2
		)
		if (name) this.name = name
		this.initGPURenderInfos()
		this.displacementTexture = new WaterTexture(redGPUContext, 1024, 1024)
		this.waterColor.setColorByHEX(color)
		this.opacity = 0.5
		this.waterIOR = 1.333
		this.waterColorStrength = 0.5
		this.use2PathRender = true
	}

	// 🌊 프리셋 적용
	applyPreset(preset: WaterPreset) {
		// 🌊 DisplacementTexture 설정 적용
		if (preset.displacementTexture) {
			this.displacementTexture?.applyPreset(preset.displacementTexture);
		}

		// 🎨 Material 설정 적용
		if (preset.waterColor !== undefined) {
			this.waterColor.setColorByHEX(preset.waterColor);
		}
		if (preset.opacity !== undefined) {
			this.opacity = preset.opacity;
		}
		if (preset.waterIOR !== undefined) {
			this.waterIOR = preset.waterIOR;
		}
		if (preset.waterColorStrength !== undefined) {
			this.waterColorStrength = preset.waterColorStrength;
		}
	}

	// 🌊 전체 설정 가져오기
	getWaterSettings(): WaterSettings {
		return {
			displacementTexture: this.displacementTexture?.getWaterSettings() || {} as WaterTextureSettings,
			opacity: this.opacity,
			waterIOR: this.waterIOR,
			waterColor: this.waterColor.hex,
			waterColorStrength: this.waterColorStrength
		};
	}

	// 🌊 설정 적용
	applyWaterSettings(settings: Partial<WaterSettings>) {
		if (settings.displacementTexture) {
			this.displacementTexture?.applyPreset(settings.displacementTexture);
		}
		if (settings.opacity !== undefined) {
			this.opacity = settings.opacity;
		}
		if (settings.waterIOR !== undefined) {
			this.waterIOR = settings.waterIOR;
		}
		if (settings.waterColor !== undefined) {
			this.waterColor.setColorByHEX(settings.waterColor);
		}
		if (settings.waterColorStrength !== undefined) {
			this.waterColorStrength = settings.waterColorStrength;
		}
	}
}

DefineForFragment.defineByPreset(WaterMaterial, [
	DefineForFragment.PRESET_COLOR_RGB.COLOR,
	DefineForFragment.PRESET_TEXTURE.NORMAL_TEXTURE,
	DefineForFragment.PRESET_SAMPLER.NORMAL_TEXTURE_SAMPLER,
	DefineForFragment.PRESET_POSITIVE_NUMBER.OPACITY,
])
Object.freeze(WaterMaterial)
DefineForFragment.defineColorRGB(WaterMaterial, [
	['waterColor', '#0D4F8C']
])
DefineForFragment.definePositiveNumber(WaterMaterial, [
	['waterIOR', 1.333, true, 1.0, 1.8],
	['waterColorStrength', 0.7, true, 0.0, 1.0],
])
export default WaterMaterial
