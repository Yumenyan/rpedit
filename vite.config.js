import {defineConfig} from 'vite';
const repository=process.env.GITHUB_REPOSITORY?.split('/')[1];
const isUserSite=repository?.endsWith('.github.io');
const base=process.env.GITHUB_ACTIONS==='true'&&repository&&!isUserSite?`/${repository}/`:'/';
export default defineConfig({
  base,
  build:{rollupOptions:{output:{manualChunks(id){
    if(id.includes('/node_modules/three/'))return 'three';
    if(id.includes('/node_modules/'))return 'tools';
  }}}},
});
