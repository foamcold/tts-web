import type { ThemeConfig } from 'antd';

/**
 * 生成 Ant Design 主题配置
 * @param primaryColor 主色调，默认为深黑色
 * @returns Ant Design 主题配置对象
 */
export const getThemeConfig = (primaryColor = '#000000'): ThemeConfig => ({
  token: {
    // 主色
    colorPrimary: primaryColor,
    // 圆角
    borderRadius: 4,
  },
  components: {
    Layout: {
      // 侧边栏背景色
      siderBg: '#000000',
      // 头部背景色
      headerBg: '#ffffff',
    },
    Menu: {
      // 菜单项背景色
      itemBg: '#000000',
      // 菜单项悬浮背景色
      itemHoverBg: 'rgba(255, 255, 255, 0.1)',
      // 选中菜单项背景色
      itemSelectedBg: '#1677ff', // 暂时使用 antd 默认蓝色作为选中色，后续可自定义
      // 菜单项文字颜色
      itemColor: 'rgba(255, 255, 255, 0.85)',
      // 选中菜单项文字颜色
      itemSelectedColor: '#ffffff',
    },
    Button: {
      // 默认按钮边框圆角
      borderRadius: 4,
    },
    Select: {
      // 这里是关键：修改下拉菜单中选项的颜色
      // antd 的 Select 比较特殊，它的下拉层背景默认是 colorBgElevated
      // 为了不影响其他组件，我们在这里直接覆盖选项的颜色
      // 选中项的文字颜色
      optionSelectedColor: '#000000', // 深色主题下，选中项背景是亮的，所以文字用黑色
      // 为了让未选中的文字也变白，需要通过 CSS-in-JS 的方式或者全局 CSS
      // 但更简单的方式是利用 antd token。我们来调整一下全局的 colorBgElevated
      // 让它影响所有浮层
      // ... 经过思考，为了最小化影响，还是只针对 Select
      // 最好的方式可能是针对下拉菜单的 className 单独写样式
      // 但这里我们尝试用 token 解决。
      // 我们需要一个白色的文字，一个深色的背景。
      // antd select 的 placeholder 和单选框选中值的颜色受 colorTextQuaternary 和 colorText a影响
    }
  },
});