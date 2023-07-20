var APP = {

	Player: function () {

		var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setClearColor( 0x000000, 0 ); // the default
		renderer.setPixelRatio(window.devicePixelRatio);

		var loader = new THREE.ObjectLoader();
		var camera, scene;

		var vrButton = VRButton.createButton( renderer ); // eslint-disable-line no-undef

		var events = {};

		var dom = document.createElement( 'div' );

		dom.appendChild( renderer.domElement );
		this.dom = dom;

		this.width = 500;
		this.height = 500;

		var mouse = new THREE.Vector2();
		var normalizedX, normalizedY = null;

		addEventListener("mousemove", (event) => {});

		onmousemove = (e) => {
			// Récupérer les dimensions maximales de l'écran
			const maxWidth = window.innerWidth;
			const maxHeight = window.innerHeight;

			// Récupérer les coordonnées de la souris
			const mouseX = e.clientX;
			const mouseY = e.clientY;

			// Normaliser les coordonnées de la souris par rapport aux dimensions maximales
			normalizedX = (mouseX / maxWidth) * 2 - 1; // Valeur entre -1 et 1
			normalizedY = -(mouseY / maxHeight) * 2 + 1; // Valeur entre -1 et 1
		};

		this.load = function ( json ) {

			var project = json.project;

			if ( project.vr !== undefined ) renderer.xr.enabled = project.vr;
			if ( project.shadows !== undefined ) renderer.shadowMap.enabled = project.shadows;
			if ( project.shadowType !== undefined ) renderer.shadowMap.type = project.shadowType;
			if ( project.toneMapping !== undefined ) renderer.toneMapping = project.toneMapping;
			if ( project.toneMappingExposure !== undefined ) renderer.toneMappingExposure = project.toneMappingExposure;
			if ( project.useLegacyLights !== undefined ) renderer.useLegacyLights = project.useLegacyLights;

			this.setScene( loader.parse( json.scene ) );
			this.setCamera( loader.parse( json.camera ) );

			events = {
				init: [],
				start: [],
				stop: [],
				keydown: [],
				keyup: [],
				pointerdown: [],
				pointerup: [],
				pointermove: [],
				update: []
			};

			var scriptWrapParams = 'player,renderer,scene,camera';
			var scriptWrapResultObj = {};

			for ( var eventKey in events ) {

				scriptWrapParams += ',' + eventKey;
				scriptWrapResultObj[ eventKey ] = eventKey;

			}

			var scriptWrapResult = JSON.stringify( scriptWrapResultObj ).replace( /\"/g, '' );

			for ( var uuid in json.scripts ) {

				var object = scene.getObjectByProperty( 'uuid', uuid, true );

				if ( object === undefined ) {

					console.warn( 'APP.Player: Script without object.', uuid );
					continue;

				}

				var scripts = json.scripts[ uuid ];

				for ( var i = 0; i < scripts.length; i ++ ) {

					var script = scripts[ i ];

					var functions = ( new Function( scriptWrapParams, script.source + '\nreturn ' + scriptWrapResult + ';' ).bind( object ) )( this, renderer, scene, camera );

					for ( var name in functions ) {

						if ( functions[ name ] === undefined ) continue;

						if ( events[ name ] === undefined ) {

							console.warn( 'APP.Player: Event type not supported (', name, ')' );
							continue;

						}

						events[ name ].push( functions[ name ].bind( object ) );

					}

				}

			}

			dispatch( events.init, arguments );

		};

		this.setCamera = function ( value ) {

			camera = value;
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();

		};

		this.setScene = function ( value ) {

			scene = value;

			const light = new THREE.DirectionalLight( 0xd5deff );
			light.position.x = 300;
			light.position.y = 250;
			light.position.z = - 500;
			scene.add( light );

			let eyesClose = scene.getObjectByName('EyeClose');
			eyesClose.visible = false;

			// Set the background color to transparent
			scene.background = null;

		};

		this.setPixelRatio = function ( pixelRatio ) {

			renderer.setPixelRatio( pixelRatio );

		};

		this.setSize = function ( width, height ) {

			this.width = width;
			this.height = height;

			if ( camera ) {

				camera.aspect = this.width / this.height;
				camera.updateProjectionMatrix();

			}

			renderer.setSize( width, height );

		};

		function dispatch( array, event ) {

			for ( var i = 0, l = array.length; i < l; i ++ ) {

				array[ i ]( event );

			}

		}

		var time, startTime, prevTime;
		let manageEyes = 0;

		function animate() {
			time = performance.now();
			manageEyes++;

			// Clear the scene manually each frame to maintain transparency
			renderer.clear();

			try {
				dispatch(events.update, { time: time - startTime, delta: time - prevTime });
			} catch (e) {
				console.error(e.message || e, e.stack || '');
			}

			let object = scene.getObjectByName('100723_louistotain.gltf');
			let eyes = scene.getObjectByName('Eye');
			let eyesClose = scene.getObjectByName('EyeClose');

			if (manageEyes === 400) {
				// On ferme les yeux
				eyes.visible = false;
				eyesClose.visible = true;

				setTimeout(() => {
					// On réouvre les yeux après un délai de 200 millisecondes (ajustez selon vos besoins)
					eyes.visible = true;
					eyesClose.visible = false;

					setTimeout(() => {
						// Deuxième clignotement après un délai de 200 millisecondes (ajustez selon vos besoins)
						// On ferme les yeux à nouveau
						eyes.visible = false;
						eyesClose.visible = true;

						setTimeout(() => {
							// On réouvre les yeux après un délai de 200 millisecondes (ajustez selon vos besoins)
							eyes.visible = true;
							eyesClose.visible = false;
						}, 150);
					}, 150);
				}, 150);

				manageEyes = 0;
			}

			if (normalizedX && normalizedY) {
				// Définir la vitesse de l'effet de rebond
				const bounceSpeed = 0.1;
				const maxOffset = 1; // Valeur de dépassement maximale

				// Mettre à jour la position de l'objet en fonction des coordonnées normalisées avec effet de rebond
				const targetX = normalizedX / 10;
				const targetY = normalizedY / 10;
				const deltaX = targetX - object.position.x;
				const deltaY = targetY - object.position.y;

				// Ajouter l'effet de rebond en dépassant légèrement les limites
				const offsetX = Math.min(Math.abs(deltaX) * bounceSpeed, maxOffset) * Math.sign(deltaX);
				const offsetY = Math.min(Math.abs(deltaY) * bounceSpeed, maxOffset) * Math.sign(deltaY);

				object.position.x += offsetX;
				object.position.y += offsetY;

				eyes.position.x += offsetX / 1.5;
				eyes.position.y += offsetY / 1.5;

				eyesClose.position.x += offsetX / 1.5;
				eyesClose.position.y += offsetY / 1.5;

				// Mettre à jour la rotation de l'objet en fonction des coordonnées normalisées avec effet de rebond
				const targetRotationY = normalizedX / 15;
				const targetRotationX = -normalizedY / 15;
				const deltaRotationY = targetRotationY - object.rotation.y;
				const deltaRotationX = targetRotationX - object.rotation.x;

				// Ajouter l'effet de rebond à la rotation en dépassant légèrement les limites
				const offsetRotationY = Math.min(Math.abs(deltaRotationY) * bounceSpeed, maxOffset) * Math.sign(deltaRotationY);
				const offsetRotationX = Math.min(Math.abs(deltaRotationX) * bounceSpeed, maxOffset) * Math.sign(deltaRotationX);

				object.rotation.y += offsetRotationY;
				object.rotation.x += offsetRotationX;
			}

			renderer.render(scene, camera);

			prevTime = time;
		}

		this.play = function () {

			if ( renderer.xr.enabled ) dom.append( vrButton );

			startTime = prevTime = performance.now();

			document.addEventListener( 'keydown', onKeyDown );
			document.addEventListener( 'keyup', onKeyUp );
			document.addEventListener( 'pointerup', onPointerUp );
			document.addEventListener( 'pointermove', onPointerMove );
			document.addEventListener("pointerdown", onPointerDown);

			dispatch( events.start, arguments );

			renderer.setAnimationLoop( animate );

		};

		this.stop = function () {

			if ( renderer.xr.enabled ) vrButton.remove();

			document.removeEventListener( 'keydown', onKeyDown );
			document.removeEventListener( 'keyup', onKeyUp );
			document.removeEventListener( 'pointerdown', onPointerDown );
			document.removeEventListener( 'pointerup', onPointerUp );
			document.removeEventListener( 'pointermove', onPointerMove );


			dispatch( events.stop, arguments );

			renderer.setAnimationLoop( null );

		};

		this.render = function ( time ) {

			dispatch( events.update, { time: time * 1000, delta: 0 /* TODO */ } );

			renderer.render( scene, camera );

		};

		this.dispose = function () {

			renderer.dispose();

			camera = undefined;
			scene = undefined;

		};

		//

		function onKeyDown( event ) {

			dispatch( events.keydown, event );

		}

		function onKeyUp( event ) {

			dispatch( events.keyup, event );

		}

		function onPointerUp( event ) {

			dispatch( events.pointerup, event );

		}

		function onPointerMove(event) {
			event.preventDefault();

			// Récupérer le groupe racine en recherchant par son nom
			const rootGroup = scene.getObjectByProperty('name', '100723_louistotain.gltf');

			// Vérifier si le groupe racine a été trouvé
			if (rootGroup instanceof THREE.Object3D) {
				const raycaster = new THREE.Raycaster();
				const mouse = new THREE.Vector2();
				mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
				raycaster.setFromCamera(mouse, camera);

				const intersects = raycaster.intersectObject(rootGroup, true);

				let isHovered;
				if (intersects.length > 0) {
					isHovered = true;
					// Modifier le style du curseur lors du survol
					// renderer.domElement.style.cursor = 'none';
					document.getElementById('cursor').style.backgroundImage = "url('img/sword.png')";
					document.getElementById('body').style.cursor = "none";

				} else {
					isHovered = false;
					// Rétablir le style du curseur lorsque le survol se termine
					// renderer.domElement.style.cursor = 'auto';
					document.getElementById('cursor').style.backgroundImage = "";
					document.getElementById('body').style.cursor = "default";
				}
			}
		}

		function onPointerDown(event) {
			event.preventDefault();

			// Récupérer les coordonnées du clic de souris
			const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
			const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

			// Créer un rayon à partir de la caméra et la position de la souris
			const raycaster = new THREE.Raycaster();
			raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), camera);

			// Intersecter le rayon avec les objets cliquables
			const intersects = raycaster.intersectObjects(scene.children, true);

			let restoreColorsTimeoutId = null;
			const restoreDuration = 100; // Durée de rétablissement en millisecondes
			const damageColor = new THREE.Color("#FF5555");

			if (intersects.length > 0) {
				const clickedObject = intersects[0].object;

				// Récupérer le groupe racine en recherchant par son nom
				const rootGroup = scene.getObjectByProperty('name', '100723_louistotain.gltf');

				// Vérifier si le groupe racine a été trouvé
				if (rootGroup instanceof THREE.Object3D) {
					const meshes = [];

					// Stocker les meshes du groupe dans un tableau
					rootGroup.traverse(function (child) {
						if (child instanceof THREE.Mesh) {
							meshes.push(child);
						}
					});

					// Stocker les couleurs d'origine des meshes s'il n'a pas été déjà stocké
					if (!rootGroup.userData.originalColors) {
						const originalColors = meshes.map((mesh) => mesh.material.color.clone());
						rootGroup.userData.originalColors = originalColors;
					}

					// Annuler le rétablissement des couleurs d'origine si en cours
					if (restoreColorsTimeoutId !== null) {
						clearTimeout(restoreColorsTimeoutId);
						restoreColorsTimeoutId = null;
					}

					// Appliquer l'effet de couleur de dégâts aux couleurs d'origine
					const originalColors = rootGroup.userData.originalColors;
					const damagedColors = originalColors.map((originalColor) => originalColor.clone().lerp(damageColor, 0.5)); // Ajuster le paramètre de mélange (ici 0.5)
					meshes.forEach((mesh, index) => {
						const damagedColor = damagedColors[index];
						mesh.material.color.copy(damagedColor);
					});

					// Récupérer la position d'origine du groupe racine
					const originalPosition = rootGroup.position.clone();

					// Déplacer le groupe racine avec une transformation aléatoire
					const damagedPosition = originalPosition.clone();
					const randomOffset = Math.random() * 0.1 - 0.05; // Ajustez les valeurs pour contrôler l'amplitude du mouvement
					damagedPosition.x += randomOffset;
					damagedPosition.y += randomOffset;
					damagedPosition.z += randomOffset;
					rootGroup.position.copy(damagedPosition);

					// Rétablir les couleurs d'origine et la position après un délai
					restoreColorsTimeoutId = setTimeout(function () {
						meshes.forEach((mesh, index) => {
							const originalColor = originalColors[index];
							mesh.material.color.copy(originalColor);
						});
						rootGroup.position.copy(originalPosition);
						restoreColorsTimeoutId = null;
					}, restoreDuration);
				} else {
					console.log("Aucun groupe racine trouvé avec le nom '100723_louistotain.gltf'.");
				}
			}
		}


	}

};

export { APP };
