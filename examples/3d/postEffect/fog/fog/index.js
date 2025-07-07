import * as RedGPU from "../../../../../dist/index.js";

const canvas = document.createElement('canvas');
document.querySelector('#example-container').appendChild(canvas);

RedGPU.init(
	canvas,
	(redGPUContext) => {
		const controller = new RedGPU.Camera.ObitController(redGPUContext);
		controller.distance = 15;
		controller.speedDistance = 0.3;
		controller.tilt = -10;

		const scene = new RedGPU.Display.Scene();
		const view = new RedGPU.Display.View3D(redGPUContext, scene, controller);

		const ibl = new RedGPU.Resource.IBL(redGPUContext, '../../../../assets/hdr/2k/the_sky_is_on_fire_2k.hdr');
		view.ibl = ibl;
		view.skybox = new RedGPU.Display.SkyBox(redGPUContext, ibl.environmentTexture);

		redGPUContext.addView(view);

		const fogEffect = new RedGPU.PostEffect.Fog(redGPUContext);
		fogEffect.fogType = RedGPU.PostEffect.Fog.EXPONENTIAL;
		fogEffect.density = 0.1;
		fogEffect.nearDistance = 5;
		fogEffect.farDistance = 30;
		fogEffect.fogColor.setColorByRGB(200, 210, 255);

		view.postEffectManager.addEffect(fogEffect);

		const directionalLight = new RedGPU.Light.DirectionalLight();
		scene.lightManager.addDirectionalLight(directionalLight);

		createTestScene(redGPUContext, scene);

		const renderer = new RedGPU.Renderer(redGPUContext);
		const render = (time) => {};
		renderer.start(redGPUContext, render);

		createControlPanel(redGPUContext, view, fogEffect);
	},
	(failReason) => {
		console.error('초기화 실패:', failReason);
		const errorDiv = document.createElement('div');
		errorDiv.style.cssText = 'color: red; padding: 20px; font-size: 16px;';
		errorDiv.textContent = `초기화 실패: ${failReason}`;
		document.body.appendChild(errorDiv);
	}
);

function createTestScene(redGPUContext, scene) {
	new RedGPU.GLTFLoader(
		redGPUContext,
		'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF/DamagedHelmet.gltf',
		(result) => {
			const mainMesh = scene.addChild(result['resultMesh']);
			mainMesh.x = 0;
			mainMesh.y = 0;
			mainMesh.z = 0;
			mainMesh.scaleX = mainMesh.scaleY = mainMesh.scaleZ = 2;
		}
	);

	const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

	for (let i = 0; i < 6; i++) {
		const angle = (Math.PI * 2 * i) / 6;
		const radius = 7;

		const sphere = new RedGPU.Primitive.Sphere(redGPUContext, 0.5, 16, 16);
		const material = new RedGPU.Material.PhongMaterial(redGPUContext, colors[i]);
		const mesh = new RedGPU.Display.Mesh(redGPUContext, sphere, material);

		mesh.x = Math.cos(angle) * radius;
		mesh.z = Math.sin(angle) * radius;
		mesh.y = 0;

		scene.addChild(mesh);
	}

	for (let i = 0; i < 8; i++) {
		const angle = (Math.PI * 2 * i) / 8;
		const radius = 17;

		const box = new RedGPU.Primitive.Box(redGPUContext, 1, 1, 1);
		const material = new RedGPU.Material.PhongMaterial(redGPUContext, colors[i % colors.length]);
		const mesh = new RedGPU.Display.Mesh(redGPUContext, box, material);

		mesh.x = Math.cos(angle) * radius;
		mesh.z = Math.sin(angle) * radius;
		mesh.y = 0;

		scene.addChild(mesh);
	}

	for (let i = 0; i < 10; i++) {
		const angle = (Math.PI * 2 * i) / 10;
		const radius = 30;

		const cylinder = new RedGPU.Primitive.Cylinder(redGPUContext, 0.5, 2, 12);
		const material = new RedGPU.Material.PhongMaterial(redGPUContext, colors[i % colors.length]);
		const mesh = new RedGPU.Display.Mesh(redGPUContext, cylinder, material);

		mesh.x = Math.cos(angle) * radius;
		mesh.z = Math.sin(angle) * radius;
		mesh.y = 0;

		scene.addChild(mesh);
	}
}

async function createControlPanel(redGPUContext, view, fogEffect) {
	const { Pane } = await import('https://cdn.jsdelivr.net/npm/tweakpane@4.0.3/dist/tweakpane.min.js');

	const pane = new Pane({ title: '🌫️ Fog Test' });

	const PARAMS = {
		enabled: true,
		fogType: 'Exponential',
		density: fogEffect.density,
		nearDistance: fogEffect.nearDistance,
		farDistance: fogEffect.farDistance,
		fogColor: { r: 200, g: 210, b: 255 }
	};

	pane.addBinding(PARAMS, 'enabled', {
		label: 'Enable Fog'
	}).on('change', (ev) => {
		if (ev.value) {
			view.postEffectManager.addEffect(fogEffect);
		} else {
			view.postEffectManager.removeAllEffect();
		}
	});

	pane.addBinding(PARAMS, 'fogType', {
		label: 'Fog Type',
		options: {
			'Exponential': 'Exponential',
			'Exponential Squared': 'ExponentialSquared'
		}
	}).on('change', (ev) => {
		switch(ev.value) {
			case 'Exponential':
				fogEffect.fogType = RedGPU.PostEffect.Fog.EXPONENTIAL;
				break;
			case 'ExponentialSquared':
				fogEffect.fogType = RedGPU.PostEffect.Fog.EXPONENTIAL_SQUARED;
				break;
		}
	});

	pane.addBinding(PARAMS, 'density', {
		label: 'Density',
		min: 0.001,
		max: 1,
		step: 0.001
	}).on('change', (ev) => {
		fogEffect.density = ev.value;
	});

	pane.addBinding(PARAMS, 'nearDistance', {
		label: 'Near Distance',
		min: 0,
		max: 30,
		step: 0.1
	}).on('change', (ev) => {
		fogEffect.nearDistance = ev.value;
		if (PARAMS.farDistance <= ev.value) {
			PARAMS.farDistance = ev.value + 1;
			fogEffect.farDistance = PARAMS.farDistance;
			pane.refresh();
		}
	});

	pane.addBinding(PARAMS, 'farDistance', {
		label: 'Far Distance',
		min: 1,
		max: 100,
		step: 0.1
	}).on('change', (ev) => {
		PARAMS.farDistance = Math.max(ev.value, PARAMS.nearDistance + 1);
		fogEffect.farDistance = PARAMS.farDistance;
	});

	pane.addBinding(PARAMS, 'fogColor', {
		label: 'Fog Color'
	}).on('change', (ev) => {
		fogEffect.fogColor.setColorByRGB(Math.floor(ev.value.r), Math.floor(ev.value.g), Math.floor(ev.value.b));
	});

	pane.addBlade({ view: 'separator' });

	const presetFolder = pane.addFolder({
		title: '🎯 Presets',
		expanded: true
	});

	presetFolder.addButton({ title: '💨 Light Mist' }).on('click', () => {
		applyPreset('Exponential', 0.05, 8, 50, { r: 230, g: 235, b: 255 });
	});

	presetFolder.addButton({ title: '🌫️ Medium Fog' }).on('click', () => {
		applyPreset('Exponential', 0.15, 5, 35, { r: 200, g: 210, b: 230 });
	});

	presetFolder.addButton({ title: '☁️ Dense Fog' }).on('click', () => {
		applyPreset('ExponentialSquared', 0.25, 3, 25, { r: 180, g: 180, b: 200 });
	});

	presetFolder.addButton({ title: '🌊 Ocean Mist' }).on('click', () => {
		applyPreset('Exponential', 0.08, 10, 60, { r: 180, g: 200, b: 255 });
	});

	function applyPreset(type, density, near, far, color) {
		PARAMS.fogType = type === 'Exponential' ? 'Exponential' : 'ExponentialSquared';
		PARAMS.density = density;
		PARAMS.nearDistance = near;
		PARAMS.farDistance = far;
		PARAMS.fogColor = color;

		fogEffect.fogType = type === 'Exponential'
			? RedGPU.PostEffect.Fog.EXPONENTIAL
			: RedGPU.PostEffect.Fog.EXPONENTIAL_SQUARED;
		fogEffect.density = density;
		fogEffect.nearDistance = near;
		fogEffect.farDistance = far;
		fogEffect.fogColor.setColorByRGB(color.r, color.g, color.b);

		pane.refresh();
	}

	const infoFolder = pane.addFolder({
		title: 'ℹ️ Info',
		expanded: false
	});

	infoFolder.addBlade({
		view: 'text',
		label: 'Objects',
		value: '가까움: 구체 (7유닛)\n중간: 박스 (17유닛)\n멀음: 원기둥 (30유닛)',
		parse: (v) => String(v),
		format: (v) => String(v)
	});
}
