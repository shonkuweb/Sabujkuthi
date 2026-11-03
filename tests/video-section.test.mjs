import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultVideoSection, parseVideoUrl, validateVideoSection } from '../lib/video-section.mjs';
const id = 'M7lc1UVf-VE';
const video = { id: 'video-1', title: 'Plant video', url: `https://www.youtube.com/watch?v=${id}`, posterUrl: '', productId: '' };
test('YouTube watch, Shorts, short links and embeds resolve to the same video', () => {
  for (const url of [`https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}?si=abc`, `https://www.youtube.com/shorts/${id}`, `https://www.youtube-nocookie.com/embed/${id}`]) assert.equal(parseVideoUrl(url).videoId,id);
});
test('direct video links preserve signed query strings', () => {
  const url='https://cdn.example.com/plants/clip.mp4?signature=example';
  assert.deepEqual(parseVideoUrl(url),{provider:'file',url});
  assert.equal(parseVideoUrl('https://cdn.example.com/clip.webm').provider,'file');
});
test('unsafe links and unsupported HTML pages cannot become video embeds', () => {
  for(const url of ['javascript:alert(1)','http://example.com/video.mp4','https://name:secret@example.com/video.mp4','https://youtube.com.evil.example/watch?v='+id,'https://example.com/page','https://youtube.com/watch?v=bad']) assert.throws(()=>parseVideoUrl(url));
});
test('section starts hidden without sample videos', () => {
  assert.equal(defaultVideoSection.enabled,false);assert.equal(defaultVideoSection.videos.length,0);
  assert.throws(()=>validateVideoSection({...defaultVideoSection,enabled:true}));
});
test('saved videos and order are retained when the section is disabled', () => {
  const config=validateVideoSection({enabled:false,title:' Nursery videos ',videos:[video,{...video,id:'video-2',title:'Second video'}]});
  assert.equal(config.title,'Nursery videos');assert.equal(config.videos.length,2);assert.equal(config.videos[1].id,'video-2');
});
test('invalid captions, duplicate IDs and unsafe covers are rejected', () => {
  assert.throws(()=>validateVideoSection({enabled:true,title:'Videos',videos:[video,video]}));
  assert.throws(()=>validateVideoSection({enabled:true,title:'Videos',videos:[{...video,title:''}]}));
  assert.throws(()=>validateVideoSection({enabled:true,title:'Videos',videos:[{...video,posterUrl:'javascript:alert(1)'}]}));
  assert.throws(()=>validateVideoSection({enabled:false,title:'Videos',videos:Array.from({length:13},(_,i)=>({...video,id:`v-${i}`}))}));
});
