import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Atom Studio · Agent 应用工作台',description:'从需求到可交互应用，支持生成、预览、迭代与版本保存。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
