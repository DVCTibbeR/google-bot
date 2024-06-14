<script lang="ts">
	export let visitId: string = "";
	export let users: any[] = [];

	function getVisit(user: any) {
		return user.visits.find((visit: any) => visit.id === visitId);
	}
</script>

<div class="flex flex-col gap-2">
	{#each users as user}
		<div class="flex flex-row gap-1.5 bg-slate-50 border border-slate-300 items-center justify-between">
			<div class="flex w-8 h-8 bg-slate-200 border-r border-slate-300 items-center justify-center">
				<p class="font-medium text-slate-800">{getVisit(user).rank}</p>
			</div>
			<div class="flex flex-row gap-1.5 items-center">
				{#each user.country.split("/ ") as country}
					<img class="w-5 h-5" src="flags/{country.replaceAll(" ", "_").toLowerCase()}.svg" alt="">
				{/each}
				<p class="text-slate-800">{user.username}</p>
			</div>
			<div class="flex h-8 bg-slate-100 border-l border-slate-300 items-center justify-center px-2">
				<p class="font-medium text-slate-800">{getVisit(user).subscribers}M</p>
			</div>
		</div>
	{/each}
</div>