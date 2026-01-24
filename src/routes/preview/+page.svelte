<script lang="ts">
  import { themes, seasonIds, baseThemeIds, type ThemeId } from '$lib/config/themes';

  // 계절 기간 정보
  const seasonPeriods: Record<string, string> = {
    winter: '1/1 ~ 2/14',
    earlySpring: '2/15 ~ 3/31',
    spring: '4/1 ~ 5/15',
    earlySummer: '5/16 ~ 6/30',
    summer: '7/1 ~ 8/14',
    earlyAutumn: '8/15 ~ 9/30',
    autumn: '10/1 ~ 11/14',
    earlyWinter: '11/15 ~ 12/31',
  };

  // 계절 한글 이름
  const seasonNames: Record<string, string> = {
    winter: '겨울',
    earlySpring: '초봄',
    spring: '봄',
    earlySummer: '초여름',
    summer: '여름',
    earlyAutumn: '초가을',
    autumn: '가을',
    earlyWinter: '초겨울',
  };

  // 기본 테마 번호
  const baseThemeNumbers: Record<string, number> = {
    neon: 1,
    sunset: 2,
    hologram: 3,
    pastel: 4,
  };

  // 텍스트 색상 판단 (밝은 배경에는 검은 글씨)
  function getTextColor(bgColor: string): string {
    const hex = bgColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }
</script>

<svelte:head>
  <title>MYA 테마 색상 미리보기</title>
</svelte:head>

<div class="container">
  <h1>MYA 12가지 테마 미리보기</h1>
  <p class="subtitle">기본 4종 + 8계절 | themes.ts에서 자동 생성</p>

  <h3>기본 테마 (4종)</h3>

  {#each baseThemeIds as themeId}
    {@const theme = themes[themeId]}
    <div class="theme" style="background: {theme.gradients[0]}">
      <h2>{baseThemeNumbers[themeId]}. {theme.name}</h2>

      <div class="section">
        <div class="section-title">배경 ({theme.gradients.length}개)</div>
        <div class="colors">
          {#each theme.gradients as gradient}
            <div class="gradient" style="background: {gradient}"></div>
          {/each}
        </div>
      </div>

      <div class="section">
        <div class="section-title">글자색 ({theme.textColors.length}개)</div>
        <div class="colors">
          {#each theme.textColors as color}
            <div class="color" style="background: {color}; color: {getTextColor(color)}">
              {color}
            </div>
          {/each}
        </div>
      </div>

      <div class="section">
        <div class="section-title">하트색 ({theme.heartColors.length}개)</div>
        <div class="colors hearts">
          {#each theme.heartColors as color}
            <span class="heart" style="color: {color}">♥</span>
          {/each}
        </div>
      </div>

      <div class="demo" style="background: {theme.gradients[0]}">
        <span class="demo-text" style="color: {theme.textColors[0]}">먀!</span>
        <span class="demo-text" style="color: {theme.textColors[1] || theme.textColors[0]}">뮤?</span>
        <span class="heart demo-heart" style="color: {theme.heartColors[0]}">♥</span>
      </div>
    </div>
  {/each}

  <h3>8계절 테마 (현재 계절 60% 확률)</h3>

  {#each seasonIds as themeId}
    {@const theme = themes[themeId]}
    <div class="theme" style="background: {theme.gradients[0]}">
      <h2>
        {seasonNames[themeId]}
        <span class="date-range">{seasonPeriods[themeId]}</span>
      </h2>

      <div class="section">
        <div class="section-title">배경 ({theme.gradients.length}개)</div>
        <div class="colors">
          {#each theme.gradients as gradient}
            <div class="gradient" style="background: {gradient}"></div>
          {/each}
        </div>
      </div>

      <div class="section">
        <div class="section-title">글자색 ({theme.textColors.length}개)</div>
        <div class="colors">
          {#each theme.textColors as color}
            <div class="color" style="background: {color}; color: {getTextColor(color)}">
              {color}
            </div>
          {/each}
        </div>
      </div>

      <div class="section">
        <div class="section-title">하트색 ({theme.heartColors.length}개)</div>
        <div class="colors hearts">
          {#each theme.heartColors as color}
            <span class="heart" style="color: {color}">♥</span>
          {/each}
        </div>
      </div>

      <div class="demo" style="background: {theme.gradients[0]}">
        <span class="demo-text" style="color: {theme.textColors[0]}">먀!</span>
        <span class="demo-text" style="color: {theme.textColors[1] || theme.textColors[0]}">뮤?</span>
        <span class="heart demo-heart" style="color: {theme.heartColors[0]}">♥</span>
      </div>
    </div>
  {/each}

  <div class="info-box">
    <h3>테마 선택 로직</h3>
    <p>
      1. 현재 날짜로 8계절 중 해당 계절 판단<br>
      2. 80% 확률로 계절 테마 (현재 계절 60%, 정규분포 감소)<br>
      3. 10% 확률로 파스텔 팝<br>
      4. 10% 확률로 네온/선셋/홀로그램 중 하나<br>
      5. 클릭 시 10% 확률로 테마 변경
    </p>
    <table>
      <tbody>
        {#each seasonIds as seasonId}
          <tr>
            <td>{seasonNames[seasonId]}</td>
            <td>{seasonPeriods[seasonId]}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  .container {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 20px;
    background: #1a1a1a;
    color: white;
    min-height: 100vh;
  }

  h1 {
    text-align: center;
    margin-bottom: 10px;
  }

  .subtitle {
    text-align: center;
    color: #888;
    margin-bottom: 30px;
    font-size: 14px;
  }

  h2 {
    margin: 20px 0 15px;
    padding: 10px;
    font-size: 20px;
    color: white;
  }

  h3 {
    color: #aaa;
    margin: 40px 0 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid #333;
  }

  .theme {
    margin-bottom: 40px;
    padding: 20px;
    border-radius: 16px;
  }

  .section {
    margin: 15px 0;
  }

  .section-title {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
  }

  .colors {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .color {
    width: 70px;
    height: 70px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: bold;
  }

  .gradient {
    width: 150px;
    height: 70px;
    border-radius: 12px;
  }

  .hearts {
    align-items: center;
  }

  .heart {
    font-size: 28px;
    margin: 0 4px;
    text-shadow: 0 0 5px rgba(0, 0, 0, 0.3);
  }

  .demo {
    padding: 25px;
    border-radius: 16px;
    margin: 20px 0;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .demo-text {
    font-size: 42px;
    font-weight: bold;
  }

  .demo-heart {
    font-size: 36px;
  }

  .date-range {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-left: 10px;
    font-weight: normal;
  }

  .info-box {
    text-align: center;
    margin: 40px 0;
    padding: 20px;
    background: #222;
    border-radius: 12px;
  }

  .info-box h3 {
    border: none;
    margin: 0 0 15px 0;
    color: white;
  }

  .info-box p {
    color: #aaa;
    line-height: 1.8;
  }

  .info-box table {
    margin: 20px auto;
    color: #aaa;
    font-size: 13px;
    border-collapse: collapse;
  }

  .info-box td {
    padding: 5px 15px;
    border: 1px solid #444;
  }
</style>
