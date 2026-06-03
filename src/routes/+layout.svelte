<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<!--
	공통 head만 여기서. OG(미리보기) 메타는 라우트별로 다르므로 각 +page.svelte의 <svelte:head>가
	소유한다(루트=먀 / play=게임). 정적 파일은 빌드 루트로 복사되므로 경로는 /mya/<file>
	(과거 버그: /mya/static/<file> → 404 → 카톡 미리보기 깨짐).
-->
<svelte:head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="먀" />
	<meta property="og:locale" content="ko_KR" />
	<meta name="twitter:card" content="summary_large_image" />
	<link rel="icon" type="image/png" href="https://xohzzwn6kcj9.github.io/mya/favicon.png" />
</svelte:head>

{@render children()}
