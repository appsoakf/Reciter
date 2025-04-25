import {
	createSSRApp
} from "vue";
import App from "./App.vue";
import LoadingError from './components/loading-error.vue';

export function createApp() {
	const app = createSSRApp(App);
	
	// 全局注册组件
	app.component('loading-error', LoadingError);
	
	return {
		app,
	};
}
