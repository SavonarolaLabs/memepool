<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { unconfirmed } from './unconfirmed';
	import planck, { Vec2, Circle, Box, World, DistanceJoint } from 'planck-js';

	interface Asset {
		amount: number;
		tokenId: string;
	}

	interface Output {
		value: number;
		assets?: Asset[];
	}

	interface Transaction {
		id: string;
		outputs: Output[];
	}

	interface UserData {
		type: 'transaction' | 'output' | 'token' | 'erg';
		data: Transaction | Output | Asset | number;
	}

	let canvas: HTMLCanvasElement;
	let world: World;
	let hoverData: Transaction | null = null;
	let mouseX = 0;
	let mouseY = 0;
	let width = window.innerWidth;
	let height = window.innerHeight;
	let animationFrameId: number;
	let isInitialized = false;
	let spawnQueue: Transaction[] = [];
	let spawnInterval: number;

	// Constants
	const WALL_THICKNESS = 20;
	const SPAWN_DELAY = 2000; // 2 seconds
	const CIRCLE_RADIUS = 20;
	const OUTPUT_BOX = {
		width: 50,
		height: 60,
		wallThickness: 4
	};
	const TOKEN_SIZE = 15;
	const ERG_BOX_SIZE = 20;
	const GRAVITY = 500;
	const SAFE_MARGIN = WALL_THICKNESS + Math.max(CIRCLE_RADIUS, OUTPUT_BOX.width / 2) + 10;

	$: if (canvas && isInitialized) {
		canvas.width = width;
		canvas.height = height;
		updateBoundaries();
	}

	function resizeHandler() {
		width = window.innerWidth;
		height = window.innerHeight;
	}

	function createBoundaries() {
		// Ground
		const ground = world.createBody();
		ground.createFixture(Box(width / 2, WALL_THICKNESS / 2), {
			friction: 0.6,
			restitution: 0.1
		});
		ground.setPosition(Vec2(width / 2, height - WALL_THICKNESS / 2));

		// Left wall
		const leftWall = world.createBody();
		leftWall.createFixture(Box(WALL_THICKNESS / 2, height / 2), {
			friction: 0.6,
			restitution: 0.1
		});
		leftWall.setPosition(Vec2(WALL_THICKNESS / 2, height / 2));

		// Right wall
		const rightWall = world.createBody();
		rightWall.createFixture(Box(WALL_THICKNESS / 2, height / 2), {
			friction: 0.6,
			restitution: 0.1
		});
		rightWall.setPosition(Vec2(width - WALL_THICKNESS / 2, height / 2));

		// Top wall
		const topWall = world.createBody();
		topWall.createFixture(Box(width / 2, WALL_THICKNESS / 2), {
			friction: 0.6,
			restitution: 0.1
		});
		topWall.setPosition(Vec2(width / 2, WALL_THICKNESS / 2));
	}

	function updateBoundaries() {
		let body = world.getBodyList();
		while (body) {
			const position = body.getPosition();
			if (body.isStatic()) {
				if (position.x === WALL_THICKNESS / 2) {
					body.setPosition(Vec2(WALL_THICKNESS / 2, height / 2));
				} else if (position.x === width - WALL_THICKNESS / 2) {
					body.setPosition(Vec2(width - WALL_THICKNESS / 2, height / 2));
				} else if (position.y === WALL_THICKNESS / 2) {
					body.setPosition(Vec2(width / 2, WALL_THICKNESS / 2));
				} else if (position.y === height - WALL_THICKNESS / 2) {
					body.setPosition(Vec2(width / 2, height - WALL_THICKNESS / 2));
				}
			}
			body = body.getNext();
		}
	}

	function createPhysicsWorld() {
		world = planck.World({
			gravity: Vec2(0, GRAVITY)
		});
		createBoundaries();
	}

	function createTransactionBody(tx: Transaction) {
		const randomOffset = (Math.random() - 0.5) * (width - 2 * SAFE_MARGIN);
		const spawnY = SAFE_MARGIN * 4; // Set a higher starting y-position to ensure clearance

		const txBody = world.createBody({
			type: 'dynamic',
			position: Vec2(width / 2 + randomOffset, spawnY),
			fixedRotation: true
		});

		txBody.createFixture(Circle(CIRCLE_RADIUS), {
			density: 1.0,
			friction: 0.5,
			restitution: 0.2
		});

		txBody.setLinearDamping(0);
		txBody.setAngularDamping(0);

		// Apply a small initial downward impulse to prevent sticking
		const initialImpulse = Vec2(0, 5); // Adjust impulse as needed
		txBody.applyLinearImpulse(initialImpulse, txBody.getWorldCenter(), true);

		txBody.setUserData({ type: 'transaction', data: tx });
		return txBody;
	}

	function createOutputBody(output: Output, txPos: Vec2, index: number, totalOutputs: number) {
		const spacing = OUTPUT_BOX.height * 1.5;
		const totalHeight = spacing * (totalOutputs - 1);
		const startY = txPos.y - totalHeight / 2;

		// Position each output box in a vertical column to the right of the transaction
		const posX = txPos.x + CIRCLE_RADIUS + OUTPUT_BOX.width / 2 + 20; // 20px padding to the right
		const posY = startY + spacing * index;

		const outputBody = world.createBody({
			type: 'dynamic',
			position: Vec2(posX, posY),
			fixedRotation: true
		});

		outputBody.createFixture(Box(OUTPUT_BOX.width / 2, OUTPUT_BOX.height / 2), {
			density: 1.0,
			friction: 0.5,
			restitution: 0.2
		});

		outputBody.setUserData({ type: 'output', data: output });
		return outputBody;
	}

	function createJoint(bodyA: planck.Body, bodyB: planck.Body) {
		const txPosition = bodyA.getWorldCenter();
		const outputPosition = bodyB.getWorldCenter();

		// Adjust the joint length so it connects from the center of the transaction to the left edge of the output box
		const jointLength = Math.abs(outputPosition.x - txPosition.x) - OUTPUT_BOX.width / 2;

		const joint = planck.DistanceJoint(
			{
				frequencyHz: 1.0,
				dampingRatio: 0.5,
				length: jointLength
			},
			bodyA,
			bodyB,
			txPosition,
			Vec2(outputPosition.x - OUTPUT_BOX.width / 2, outputPosition.y) // Connect to left edge of output box
		);
		world.createJoint(joint);
	}

	function spawnTransaction() {
		if (spawnQueue.length === 0) {
			clearInterval(spawnInterval);
			return;
		}

		const tx = spawnQueue.shift()!;
		const txBody = createTransactionBody(tx);

		tx.outputs.forEach((output, outputIndex) => {
			const outputBody = createOutputBody(
				output,
				txBody.getPosition(),
				outputIndex,
				tx.outputs.length
			);
			createJoint(txBody, outputBody);
		});
	}

	function drawTransaction(ctx: CanvasRenderingContext2D, position: Vec2, data: Transaction) {
		ctx.save();
		ctx.translate(position.x, position.y);

		ctx.beginPath();
		ctx.arc(0, 0, CIRCLE_RADIUS, 0, 2 * Math.PI);
		ctx.fillStyle = '#4A90E2';
		ctx.fill();
		ctx.strokeStyle = '#2171CD';
		ctx.lineWidth = 2;
		ctx.stroke();

		ctx.fillStyle = 'white';
		ctx.font = '12px Arial';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(abbreviateId(data.id), 0, 0);

		ctx.restore();
	}

	function formatAmount(amount: number): string {
		if (amount >= 1_000_000) {
			return (amount / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'M';
		} else if (amount >= 1_000) {
			return (amount / 1_000).toFixed(2).replace(/\.?0+$/, '') + 'k';
		}
		return amount.toFixed(2).replace(/\.?0+$/, '');
	}

	function drawToken(ctx: CanvasRenderingContext2D, x: number, y: number, asset: Asset) {
		// Draw token square
		ctx.fillStyle = '#F1C40F';
		ctx.fillRect(x, y, TOKEN_SIZE, TOKEN_SIZE);
		ctx.strokeStyle = '#F39C12';
		ctx.lineWidth = 1;
		ctx.strokeRect(x, y, TOKEN_SIZE, TOKEN_SIZE);

		// Draw token ID and abbreviated amount
		ctx.fillStyle = 'black';
		ctx.font = '8px Arial';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(abbreviateId(asset.tokenId), x + TOKEN_SIZE / 2, y + TOKEN_SIZE / 2 - 5);
		ctx.fillText(formatAmount(asset.amount), x + TOKEN_SIZE / 2, y + TOKEN_SIZE / 2 + 5);
	}

	function drawOutput(ctx: CanvasRenderingContext2D, position: Vec2, data: Output) {
		ctx.save();
		ctx.translate(position.x, position.y);

		// Draw outer box border
		ctx.strokeStyle = '#34495E';
		ctx.lineWidth = OUTPUT_BOX.wallThickness;
		ctx.strokeRect(
			-OUTPUT_BOX.width / 2,
			-OUTPUT_BOX.height / 2,
			OUTPUT_BOX.width,
			OUTPUT_BOX.height
		);

		// Draw inner box background
		ctx.fillStyle = '#ECF0F1';
		ctx.fillRect(
			-OUTPUT_BOX.width / 2 + OUTPUT_BOX.wallThickness / 2,
			-OUTPUT_BOX.height / 2 + OUTPUT_BOX.wallThickness / 2,
			OUTPUT_BOX.width - OUTPUT_BOX.wallThickness,
			OUTPUT_BOX.height - OUTPUT_BOX.wallThickness
		);

		// Draw ERG value box
		ctx.fillStyle = '#2ECC71';
		ctx.fillRect(
			-OUTPUT_BOX.width / 2 + 10,
			-OUTPUT_BOX.height / 2 + 10,
			ERG_BOX_SIZE,
			ERG_BOX_SIZE
		);

		// Draw ERG amount and label inside the green square
		ctx.fillStyle = 'black';
		ctx.font = '8px Arial';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(
			`${formatAmount(data.value)} ERG`,
			-OUTPUT_BOX.width / 2 + 10 + ERG_BOX_SIZE / 2,
			-OUTPUT_BOX.height / 2 + 10 + ERG_BOX_SIZE / 2
		);

		// Draw tokens if available
		if (data.assets?.length) {
			const startX = -OUTPUT_BOX.width / 2 + 10;
			const startY = -OUTPUT_BOX.height / 2 + ERG_BOX_SIZE + 20;
			const tokensPerRow = Math.floor((OUTPUT_BOX.width - 20) / (TOKEN_SIZE + 5));

			data.assets.forEach((asset, idx) => {
				const row = Math.floor(idx / tokensPerRow);
				const col = idx % tokensPerRow;
				const x = startX + col * (TOKEN_SIZE + 5);
				const y = startY + row * (TOKEN_SIZE + 5);

				drawToken(ctx, x, y, asset);
			});
		}

		ctx.restore();
	}

	function drawJoints(ctx: CanvasRenderingContext2D, body: planck.Body) {
		for (let joint = body.getJointList(); joint; joint = joint.next) {
			const p1 = body.getPosition();
			const p2 = joint.other.getPosition();

			ctx.beginPath();
			ctx.moveTo(p1.x, p1.y);
			ctx.lineTo(p2.x, p2.y);
			ctx.strokeStyle = '#95A5A6';
			ctx.lineWidth = 2;
			ctx.stroke();
		}
	}

	function getBodyAtMouse(x: number, y: number) {
		let selectedBody: planck.Body | null = null;
		const mousePoint = Vec2(x, y);

		// Iterate through the linked list of bodies
		let body = world.getBodyList();
		while (body) {
			let fixture = body.getFixtureList();
			while (fixture) {
				if (fixture.testPoint(mousePoint)) {
					selectedBody = body;
					break;
				}
				fixture = fixture.getNext();
			}
			if (selectedBody) break; // Exit if a body is found
			body = body.getNext();
		}

		return selectedBody;
	}

	// add dragging
	let draggedBody: planck.Body | null = null;
	let isDragging = false;
	let mousePosition = Vec2(0, 0);

	function handleMouseDown(event: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		mouseX = event.clientX - rect.left;
		mouseY = event.clientY - rect.top;
		mousePosition = Vec2(mouseX, mouseY);

		const body = getBodyAtMouse(mouseX, mouseY);
		if (body) {
			draggedBody = body;
			isDragging = true;
		}
	}

	function handleMouseMove(event: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		mouseX = event.clientX - rect.left;
		mouseY = event.clientY - rect.top;
		mousePosition = Vec2(mouseX, mouseY);

		if (isDragging && draggedBody) {
			// Calculate force direction toward the mouse position
			const bodyPosition = draggedBody.getPosition();
			const forceDirection = Vec2(
				mousePosition.x - bodyPosition.x,
				mousePosition.y - bodyPosition.y
			);

			// Apply a scaled force to move the body toward the mouse
			const forceMagnitude = 500 * draggedBody.getMass();
			draggedBody.applyForceToCenter(forceDirection.mul(forceMagnitude));
		}
	}

	function handleMouseUp(event: MouseEvent) {
		isDragging = false;
		draggedBody = null;
	}

	function animate(ctx: CanvasRenderingContext2D) {
		world.step(1 / 60);

		ctx.clearRect(0, 0, width, height);

		ctx.fillStyle = '#34495E';
		ctx.fillRect(0, 0, width, WALL_THICKNESS); // Top
		ctx.fillRect(0, height - WALL_THICKNESS, width, WALL_THICKNESS); // Bottom
		ctx.fillRect(0, 0, WALL_THICKNESS, height); // Left
		ctx.fillRect(width - WALL_THICKNESS, 0, WALL_THICKNESS, height); // Right

		for (let body = world.getBodyList(); body; body = body.getNext()) {
			const userData = body.getUserData() as UserData;
			if (!userData) continue;

			const position = body.getPosition();

			if (userData.type === 'transaction') {
				drawJoints(ctx, body);
				drawTransaction(ctx, position, userData.data as Transaction);
			} else if (userData.type === 'output') {
				drawOutput(ctx, position, userData.data as Output);
			}
		}

		animationFrameId = requestAnimationFrame(() => animate(ctx));
	}

	function abbreviateId(id: string): string {
		return id.length > 4 ? `${id.slice(0, 2)}...${id.slice(-2)}` : id;
	}

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		window.addEventListener('resize', resizeHandler);
		canvas.addEventListener('mousedown', handleMouseDown);
		canvas.addEventListener('mousemove', handleMouseMove);
		canvas.addEventListener('mouseup', handleMouseUp);

		createPhysicsWorld();

		spawnQueue = [...unconfirmed.items];
		spawnInterval = setInterval(spawnTransaction, SPAWN_DELAY);

		isInitialized = true;
		animate(ctx);
	});

	onDestroy(() => {
		window.removeEventListener('resize', resizeHandler);
		canvas.removeEventListener('mousedown', handleMouseDown);
		canvas.removeEventListener('mousemove', handleMouseMove);
		canvas.removeEventListener('mouseup', handleMouseUp);
		cancelAnimationFrame(animationFrameId);
		clearInterval(spawnInterval);
		world.clearForces();
	});
</script>

<canvas bind:this={canvas} class="h-screen w-full"></canvas>

{#if hoverData}
	<div
		class="absolute rounded-lg border bg-white p-4 shadow-lg"
		style="top:{mouseY + 20}px; left:{mouseX + 20}px;"
	>
		<h3 class="mb-2 text-lg font-bold">Transaction Details</h3>
		<p class="mb-1"><strong>ID:</strong> {hoverData.id}</p>
		<p class="mb-1"><strong>Outputs:</strong> {hoverData.outputs.length}</p>
		<p class="mb-1">
			<strong>Total Value:</strong>
			{hoverData.outputs.reduce((sum, output) => sum + output.value, 0)} ERG
		</p>
		{#if hoverData.outputs.some((output) => output.assets?.length > 0)}
			<p class="mt-2 font-semibold">Tokens:</p>
			<ul class="list-inside list-disc">
				{#each hoverData.outputs.flatMap((output) => output.assets || []) as asset}
					<li class="text-sm">
						{asset.amount} - {abbreviateId(asset.tokenId)}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	canvas {
		background-color: #f5f5f5;
		touch-action: none;
	}
</style>
