<script lang="ts">
	import Ranking from "../components/Ranking.svelte";

	let openVisit: string | null = null;

	let data: any = { youtubers: {}, visits: {} };

	function loadData(ev: any) {
		const READER = new FileReader();
		
		READER.onload = () => { data = JSON.parse(READER.result!.toString()); };

		READER.readAsText(ev.target.files[0]);
	}
</script>

<main class="flex flex-col gap-3 min-h-screen bg-slate-50 p-8">
	<input type="file" name="" id="" on:change={loadData}>
	{#if data}
		{#each Object.keys(data.visits) as visit}
			<div class="flex flex-col gap-2">
				<button on:click={() => openVisit = openVisit !== visit ? visit : null} class="flex flex-row bg-slate-100 border border-slate-200 justify-between p-2 px-2.5">
					<p class="font-medium text-slate-800">{new Date(data.visits[visit].collectedOn).toLocaleTimeString("nl-NL")} &middot; {new Date(data.visits[visit].collectedOn).toLocaleDateString("nl-NL")}</p>
					<a class="cursor-pointer text-slate-400 hover:underline" href="{data.visits[visit].url}">{data.visits[visit].url}</a>
				</button>
				{#if openVisit === visit}
					<div class="bg-slate-100 border border-slate-200 p-2 px-2.5">
						<Ranking visitId={visit} users={Object.values(data.youtubers)} />
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</main>