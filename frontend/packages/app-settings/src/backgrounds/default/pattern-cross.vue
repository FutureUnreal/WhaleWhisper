<template>
  <div class="tech-grid-container">
    <slot />
  </div>
</template>

<style lang="css" scoped>
/* 
DataWhale Tech Grid - Circuit Board Inspired
科技感电路板网格，象征数据流动和AI连接
*/
.tech-grid-container {
  position: relative;
  background-color: #f0f8ff;
  --grid-primary: rgba(0, 180, 255, 0.15);
  --grid-secondary: rgba(0, 180, 255, 0.08);
  --node-color: rgba(0, 180, 255, 0.35);
  --circuit-line: rgba(0, 180, 255, 0.12);
  
  background-image:
    /* Main grid lines */
    repeating-linear-gradient(0deg, 
      transparent 0px, 
      transparent 39px, 
      var(--grid-primary) 39px, 
      var(--grid-primary) 40px
    ),
    repeating-linear-gradient(90deg, 
      transparent 0px, 
      transparent 39px, 
      var(--grid-primary) 39px, 
      var(--grid-primary) 40px
    ),
    /* Secondary fine grid */
    repeating-linear-gradient(0deg, 
      transparent 0px, 
      transparent 19px, 
      var(--grid-secondary) 19px, 
      var(--grid-secondary) 20px
    ),
    repeating-linear-gradient(90deg, 
      transparent 0px, 
      transparent 19px, 
      var(--grid-secondary) 19px, 
      var(--grid-secondary) 20px
    ),
    /* Circuit nodes */
    radial-gradient(circle at 0% 0%, var(--node-color) 2px, transparent 2px),
    /* Diagonal data flow lines */
    repeating-linear-gradient(45deg, 
      transparent 0px, 
      transparent 79px, 
      var(--circuit-line) 79px, 
      var(--circuit-line) 80px
    ),
    /* Ambient glow */
    radial-gradient(ellipse at top, rgba(0, 180, 255, 0.05) 0%, transparent 60%);
  
  background-size:
    40px 40px,
    40px 40px,
    20px 20px,
    20px 20px,
    40px 40px,
    80px 80px,
    100% 100%;
  
  background-position:
    0 0,
    0 0,
    0 0,
    0 0,
    0 0,
    0 0,
    0 0;
}

.dark .tech-grid-container {
  background-color: #030a15;
  --grid-primary: rgba(0, 180, 255, 0.25);
  --grid-secondary: rgba(0, 180, 255, 0.12);
  --node-color: rgba(0, 180, 255, 0.5);
  --circuit-line: rgba(0, 180, 255, 0.18);
  
  background-image:
    repeating-linear-gradient(0deg, 
      transparent 0px, 
      transparent 39px, 
      var(--grid-primary) 39px, 
      var(--grid-primary) 40px
    ),
    repeating-linear-gradient(90deg, 
      transparent 0px, 
      transparent 39px, 
      var(--grid-primary) 39px, 
      var(--grid-primary) 40px
    ),
    repeating-linear-gradient(0deg, 
      transparent 0px, 
      transparent 19px, 
      var(--grid-secondary) 19px, 
      var(--grid-secondary) 20px
    ),
    repeating-linear-gradient(90deg, 
      transparent 0px, 
      transparent 19px, 
      var(--grid-secondary) 19px, 
      var(--grid-secondary) 20px
    ),
    radial-gradient(circle at 0% 0%, var(--node-color) 2px, transparent 2px),
    repeating-linear-gradient(45deg, 
      transparent 0px, 
      transparent 79px, 
      var(--circuit-line) 79px, 
      var(--circuit-line) 80px
    ),
    radial-gradient(ellipse at top, rgba(0, 180, 255, 0.08) 0%, transparent 60%);
  
  background-size:
    40px 40px,
    40px 40px,
    20px 20px,
    20px 20px,
    40px 40px,
    80px 80px,
    100% 100%;
  
  background-position:
    0 0,
    0 0,
    0 0,
    0 0,
    0 0,
    0 0,
    0 0;
}
</style>
