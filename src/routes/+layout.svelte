<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<meta property="og:title" content="먀" />
	<meta property="og:description" content="특별한 메시지를 확인해보세요" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content="https://xohzzwn6kcj9.github.io/mya/" />
	<meta property="og:image" content="https://xohzzwn6kcj9.github.io/mya/static/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:site_name" content="먀" />
	<meta property="og:locale" content="ko_KR" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content="https://xohzzwn6kcj9.github.io/mya/static/og-image.png" />
	<link rel="icon" type="image/png" href="https://xohzzwn6kcj9.github.io/mya/static/favicon.png" />
	<title>먀</title>
</svelte:head>

{@render children()}
