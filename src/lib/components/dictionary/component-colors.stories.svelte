<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import CharacterGlyph from './character-glyph.svelte';
	import CharacterBreakdown from './character-breakdown.svelte';
	import {
		getComponentColor,
		getAdjustedComponentColor,
		componentTitles
	} from './component-colors';
	import type { ComponentData } from '$lib/types/dictionary';

	const { Story } = defineMeta({
		title: 'Dictionary/Component Colors'
	});

	// 學 stroke data from makemeahanzi (16 strokes)
	const xueStrokes = [
		'M 287 710 Q 320 731 353 753 Q 366 766 385 774 Q 401 781 392 795 Q 382 808 362 818 Q 343 828 334 826 Q 324 825 328 815 Q 329 802 282 733 Q 278 729 275 723 C 260 697 262 694 287 710 Z',
		'M 331 479 Q 321 522 314 558 L 309 581 Q 303 611 298 643 L 295 666 Q 292 703 287 710 L 275 723 Q 253 736 228 739 Q 215 742 208 735 Q 202 728 210 715 Q 234 684 248 648 Q 261 612 294 472 C 301 443 338 450 331 479 Z',
		'M 298 643 Q 353 656 395 664 Q 413 668 405 678 Q 396 688 376 691 Q 345 691 295 666 C 268 653 269 636 298 643 Z',
		'M 314 558 Q 365 567 402 575 Q 421 579 413 590 Q 403 600 382 603 Q 357 604 309 581 C 282 568 284 553 314 558 Z',
		'M 525 767 Q 547 800 564 810 Q 570 816 568 825 Q 567 832 550 848 Q 534 861 522 862 Q 510 862 515 848 Q 521 835 490 781 L 475 759 Q 459 737 437 711 Q 431 705 429 701 Q 426 695 435 696 Q 453 696 499 742 L 525 767 Z',
		'M 499 742 Q 554 699 564 696 Q 568 696 572 702 Q 578 709 567 732 Q 560 751 525 767 L 490 781 Q 459 794 439 800 Q 435 801 434 795 Q 434 791 475 759 L 499 742 Z',
		'M 518 611 Q 537 638 548 646 Q 554 652 551 659 Q 550 666 534 680 Q 519 692 509 692 Q 499 691 502 679 Q 508 666 487 626 L 473 602 Q 472 601 470 597 Q 451 569 424 537 Q 418 533 417 528 Q 416 522 423 523 Q 438 526 496 585 L 518 611 Z',
		'M 496 585 Q 544 543 552 540 Q 556 540 560 546 Q 566 553 557 577 Q 548 599 518 611 L 487 626 Q 454 641 435 647 Q 431 650 430 643 Q 430 636 436 630 Q 452 618 473 602 L 496 585 Z',
		'M 729 538 Q 771 698 811 759 Q 821 769 819 780 Q 813 796 759 825 Q 744 834 730 830 Q 679 820 615 813 Q 596 813 603 801 Q 613 791 629 784 Q 641 780 709 791 Q 716 795 726 791 Q 736 784 732 759 Q 728 738 721 713 L 716 692 Q 709 664 700 632 L 693 607 Q 683 571 670 529 C 661 500 721 509 729 538 Z',
		'M 721 713 Q 703 731 645 719 Q 624 712 607 706 Q 592 703 609 690 Q 610 689 716 692 C 745 693 744 693 721 713 Z',
		'M 700 632 Q 670 650 591 622 Q 576 619 593 606 Q 597 602 609 603 Q 655 607 693 607 C 723 607 726 618 700 632 Z',
		'M 194 459 Q 179 489 171 495 Q 155 508 153 484 Q 159 448 105 384 Q 89 363 113 314 Q 129 293 143 316 Q 143 317 189 430 C 198 452 198 452 194 459 Z',
		'M 189 430 Q 217 414 245 421 Q 440 481 716 504 Q 780 511 801 508 Q 817 505 816 495 Q 794 450 770 405 L 771 404 Q 778 400 797 410 Q 855 443 902 451 Q 941 458 941 469 Q 938 479 870 537 Q 851 555 825 553 Q 779 546 729 538 L 670 529 Q 543 514 331 479 L 294 472 Q 243 466 194 459 C 164 455 161 441 189 430 Z',
		'M 517 293 Q 634 368 668 375 Q 687 379 682 396 Q 679 412 618 450 Q 600 460 578 453 Q 514 431 414 403 Q 389 396 327 398 Q 305 398 312 379 Q 319 367 338 356 Q 368 340 399 359 Q 559 416 575 410 Q 585 404 582 393 Q 545 351 502 302 C 482 279 492 277 517 293 Z',
		'M 546 249 Q 536 279 517 293 L 502 302 Q 495 308 483 311 Q 462 318 452 312 Q 439 305 453 292 Q 480 273 492 241 L 502 205 Q 523 90 492 24 Q 479 -4 442 0 Q 411 3 384 7 Q 372 8 378 -2 Q 382 -9 402 -20 Q 444 -50 459 -74 Q 469 -90 486 -88 Q 499 -87 525 -59 Q 594 25 556 210 L 546 249 Z',
		'M 556 210 Q 649 217 868 218 Q 890 218 895 228 Q 902 241 883 256 Q 828 298 784 290 Q 693 271 546 249 L 492 241 Q 338 222 158 200 Q 134 199 152 179 Q 168 164 187 158 Q 211 151 229 157 Q 382 197 502 205 L 556 210 Z'
	];

	const xueFragments: number[][] = [
		[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
		[6, 7],
		[0, 1, 2, 3],
		[8, 9, 10],
		[11, 12],
		[13, 14, 15]
	];

	const xueComponents: ComponentData[] = [
		{ character: '𦥑', hint: 'Depicts two hands.', type: ['iconic'] },
		{ character: '爻', type: ['sound'], isOldPronunciation: true },
		{ character: '宀', type: ['iconic'], hint: 'Depicts a roof.' },
		{ character: '子', type: ['iconic'], hint: 'Depicts a child.' }
	];

	const allTypes = [
		'meaning',
		'sound',
		'iconic',
		'simplified',
		'unknown',
		'remnant',
		'distinguishing',
		'deleted'
	] as const;

	// Synthetic test: two meaning + two sound components
	const syntheticComponents: ComponentData[] = [
		{ character: 'A', type: ['meaning'] },
		{ character: 'B', type: ['meaning'] },
		{ character: 'C', type: ['sound'] },
		{ character: 'D', type: ['sound'] }
	];
	const syntheticFragments: number[][] = [
		[0, 1, 2, 3],
		[4, 5, 6, 7],
		[8, 9, 10],
		[11, 12, 13, 14, 15]
	];

	// Multi-type test: components with 2-3 types each
	const multiTypeComponents: ComponentData[] = [
		{ character: '𦥑', type: ['meaning', 'sound'], hint: 'Meaning + Sound component' },
		{ character: '爻', type: ['sound'] },
		{ character: '宀', type: ['meaning', 'sound', 'iconic'], hint: 'Three types' },
		{ character: '子', type: ['iconic'] }
	];

	// 10 permutations of type assignments across 6 fragments for variety
	const permutations: string[][] = [
		['meaning', 'sound', 'iconic', 'meaning', 'sound', 'iconic'],
		['iconic', 'iconic', 'iconic', 'iconic', 'iconic', 'iconic'],
		['meaning', 'meaning', 'meaning', 'sound', 'sound', 'sound'],
		['sound', 'iconic', 'meaning', 'distinguishing', 'remnant', 'simplified'],
		['simplified', 'simplified', 'meaning', 'meaning', 'iconic', 'sound'],
		['distinguishing', 'sound', 'sound', 'iconic', 'meaning', 'meaning'],
		['remnant', 'meaning', 'iconic', 'sound', 'remnant', 'meaning'],
		['meaning', 'unknown', 'sound', 'unknown', 'meaning', 'sound'],
		['iconic', 'meaning', 'sound', 'simplified', 'distinguishing', 'remnant'],
		['sound', 'sound', 'meaning', 'iconic', 'iconic', 'meaning']
	];

	const permComponents: ComponentData[][] = permutations.map((types) =>
		types.map((t, i) => ({ character: String.fromCharCode(65 + i), type: [t] }))
	);
</script>

<Story name="All Colors">
	<div class="story-page">
		<section>
			<h2>Component Type Colors</h2>
			<p class="subtitle">Base colors for each component type</p>
			<div class="swatch-grid">
				{#each allTypes as type (type)}
					<div class="swatch-item">
						<div class="swatch" style:background={getComponentColor(type)}></div>
						<span class="swatch-label">{componentTitles[type]}</span>
					</div>
				{/each}
			</div>
		</section>

		<section>
			<h2>Same-Type Offset Variations</h2>
			<p class="subtitle">Each row shows how a type shifts for duplicate components (offset 0–5)</p>
			<div class="offset-grid">
				{#each allTypes as type (type)}
					<div class="offset-row">
						<span class="offset-type">{componentTitles[type]}</span>
						{#each [0, 1, 2, 3, 4, 5] as offset (offset)}
							<div class="swatch-item">
								<div
									class="swatch"
									style:background={getAdjustedComponentColor(type, offset)}
								></div>
								<span class="swatch-label">#{offset}</span>
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</section>

		<section>
			<h2>學 — Header Glyph (colored strokes)</h2>
			<p class="subtitle">4 components: 𦥑 (iconic), 爻 (sound), 宀 (iconic #2), 子 (iconic #3)</p>
			<div class="glyph-row">
				<div class="glyph-large">
					<CharacterGlyph
						character="學"
						strokes={xueStrokes}
						components={xueComponents}
						allFragments={xueFragments}
					/>
				</div>
			</div>
		</section>

		<section>
			<h2>學 — Breakdown Glyphs (ghost + highlight)</h2>
			<p class="subtitle">Each component's fragment highlighted against ghost strokes</p>
			<div class="glyph-row">
				{#each xueComponents as comp, i (i)}
					<div class="glyph-card">
						<div class="glyph-small">
							<CharacterGlyph
								character={comp.character}
								strokes={xueStrokes}
								components={xueComponents}
								allFragments={xueFragments}
								highlightIndex={i}
							/>
						</div>
						<span class="glyph-label">{comp.character}</span>
						<span class="glyph-type">{comp.type?.map((t) => componentTitles[t]).join(', ')}</span>
					</div>
				{/each}
			</div>
		</section>

		<section>
			<h2>學 — Full Breakdown Component</h2>
			<CharacterBreakdown
				character="學"
				components={xueComponents}
				hint="Depicts two hands (𦥑) teaching a child (子) under a roof (宀). 爻 represents the sound."
				originalMeaning={null}
				historicalPronunciations={null}
				strokes={xueStrokes}
				fragments={xueFragments}
			/>
		</section>

		<section>
			<h2>Synthetic — Duplicate Types</h2>
			<p class="subtitle">
				Two meaning + two sound components to verify same-type offset distinction
			</p>
			<div class="glyph-row">
				<div class="glyph-large">
					<CharacterGlyph
						character="學"
						strokes={xueStrokes}
						components={syntheticComponents}
						allFragments={syntheticFragments}
					/>
				</div>
			</div>
			<div class="glyph-row">
				{#each syntheticComponents as comp, i (i)}
					<div class="glyph-card">
						<div class="glyph-small">
							<CharacterGlyph
								character={comp.character}
								strokes={xueStrokes}
								components={syntheticComponents}
								allFragments={syntheticFragments}
								highlightIndex={i}
							/>
						</div>
						<span class="glyph-label"
							>{comp.character} — {comp.type?.map((t) => componentTitles[t]).join(', ')}</span
						>
					</div>
				{/each}
			</div>
		</section>

		<section>
			<h2>Multi-Type Components (Striped)</h2>
			<p class="subtitle">Components with 2–3 types rendered as diagonal stripes</p>
			<div class="glyph-row">
				<div class="glyph-large">
					<CharacterGlyph
						character="學"
						strokes={xueStrokes}
						components={multiTypeComponents}
						allFragments={xueFragments}
					/>
				</div>
			</div>
			<div class="glyph-row">
				{#each multiTypeComponents as comp, i (i)}
					<div class="glyph-card">
						<div class="glyph-small">
							<CharacterGlyph
								character={comp.character}
								strokes={xueStrokes}
								components={multiTypeComponents}
								allFragments={xueFragments}
								highlightIndex={i}
							/>
						</div>
						<span class="glyph-label">{comp.character}</span>
						<span class="glyph-type">{comp.type?.map((t) => componentTitles[t]).join(' + ')}</span>
					</div>
				{/each}
			</div>

			<h3>At Breakdown Size (40px)</h3>
			<div class="glyph-row">
				{#each multiTypeComponents as comp, i (i)}
					<div class="glyph-card">
						<div class="glyph-tiny">
							<CharacterGlyph
								character={comp.character}
								strokes={xueStrokes}
								components={multiTypeComponents}
								allFragments={xueFragments}
								highlightIndex={i}
							/>
						</div>
						<span class="swatch-label"
							>{comp.type?.map((t) => componentTitles[t]?.slice(0, 4)).join('+')}</span
						>
					</div>
				{/each}
			</div>

			<h3>Full Breakdown with Multi-Type</h3>
			<CharacterBreakdown
				character="學"
				components={multiTypeComponents}
				hint="Same 學 fragments but with multi-type assignments for testing."
				originalMeaning={null}
				historicalPronunciations={null}
				strokes={xueStrokes}
				fragments={xueFragments}
			/>
		</section>

		<section>
			<h2>10 Permutations</h2>
			<p class="subtitle">學 with varied type assignments across its 6 fragments</p>
			<div class="perm-row">
				{#each permComponents as comps, i (i)}
					<div class="glyph-card">
						<div class="glyph-medium">
							<CharacterGlyph
								character="學"
								strokes={xueStrokes}
								components={comps}
								allFragments={xueFragments}
							/>
						</div>
						<span class="perm-label">#{i + 1}</span>
					</div>
				{/each}
			</div>
		</section>

		<section>
			<h2>No Strokes — Text Fallback</h2>
			<div class="glyph-row">
				<div class="glyph-card">
					<div class="glyph-small fallback">
						<CharacterGlyph character="學" strokes={null} />
					</div>
					<span class="glyph-label">Plain text fallback</span>
				</div>
			</div>
		</section>
	</div>
</Story>

<style>
	.story-page {
		max-width: 800px;
		display: flex;
		flex-direction: column;
		gap: 2.5rem;
	}

	section h2 {
		margin-bottom: 0.25rem;
	}

	.subtitle {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin-bottom: 1rem;
	}

	.swatch-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.swatch-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.swatch {
		width: 48px;
		height: 48px;
		border-radius: 6px;
		border: 1px solid var(--border);
	}

	.swatch-label {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.offset-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.offset-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.offset-type {
		width: 100px;
		font-size: 0.875rem;
		font-weight: 600;
		text-align: right;
	}

	.glyph-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		align-items: flex-start;
	}

	.glyph-large {
		width: 120px;
		height: 120px;
	}

	.glyph-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.glyph-small {
		width: 64px;
		height: 64px;
	}

	.glyph-small.fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 3rem;
		border: 1px dashed var(--border);
		border-radius: 6px;
	}

	.perm-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.glyph-medium {
		width: 80px;
		height: 80px;
	}

	.perm-label {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.glyph-label {
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.glyph-type {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.glyph-tiny {
		width: 40px;
		height: 40px;
	}

	section h3 {
		font-size: 0.9375rem;
		font-weight: 600;
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
	}
</style>
