import * as React from "react";
import { EasingFunction, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from "react-native";

import { TextInput } from "react-native-gesture-handler";
import Animated, {
  Easing,
  EasingFunctionFactory,
  FadeInDown,
  FadeOutDown,
  SharedValue,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type AnimatedTextProps = {
  animatedValue: SharedValue<number>;
  style?: TextStyle;
  formatter?: (value: SharedValue<number>) => string;
};
export const AnimatedText = ({ animatedValue, formatter, style }: AnimatedTextProps) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      text: formatter ? formatter(animatedValue) : Math.round(animatedValue.value).toString(),
      defaultValue: formatter
        ? formatter(animatedValue)
        : Math.round(animatedValue.value).toString(),
    };
  });
  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      pointerEvents={"none"}
      animatedProps={animatedProps}
      style={[style, { fontVariant: ["tabular-nums"] }]}
    />
  );
};

type DonutChartProps = {
  percentage?: number;
  radius?: number;
  strokeWidth?: number;
  duration?: number;
  color?: string;
  textColor?: string;
  max: number;
  easing?: EasingFunctionFactory | EasingFunction;
  formatter?: (value: SharedValue<number>) => string;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  timer?: boolean;
};

export const DonutChart: React.FC<React.PropsWithChildren<DonutChartProps>> = ({
  percentage = 90,
  radius = 80,
  strokeWidth = 20,
  duration = 5000,
  color = "tomato",
  textColor,
  max = 100,
  easing = Easing.inOut(Easing.ease),
  formatter,
  textStyle,
  style,
  children,
  timer = false,
}) => {
  const animated = useSharedValue(0);
  const circumference = 2 * Math.PI * radius;

  React.useEffect(() => {
    if (timer) {
      animated.value = withTiming(percentage, { duration: 1000 }, () => {
        animated.value = duration
          ? withTiming(max, {
              duration,
              easing,
            })
          : withSpring(percentage);
      });
    } else {
      animated.value = duration
        ? withTiming(percentage, {
            duration,
            easing,
          })
        : withSpring(percentage);
    }
  }, [percentage, duration, animated, easing, timer, max]);

  const circleProps = useAnimatedProps(() => {
    // calc percentage based on animated value and 100%
    const perc = (100 * animated.value) / max;
    return {
      strokeDashoffset: circumference - (circumference * perc) / 100,
    };
  });

  return (
    <Animated.View
      style={[style, { width: radius * 2, height: radius * 2 }]}
      exiting={FadeOutDown}
      entering={FadeInDown}
    >
      <Svg
        height={radius * 2}
        width={radius * 2}
        viewBox={`0 0 ${(radius + strokeWidth) * 2} ${(radius + strokeWidth) * 2}`}
      >
        <G rotation="-90" origin={`${radius + strokeWidth}, ${radius + strokeWidth}`}>
          <AnimatedCircle
            cx="50%"
            cy="50%"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={circleProps}
          />
          <Circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
            strokeOpacity=".1"
          />
        </G>
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.center]}>
        {children}
        <AnimatedText
          animatedValue={animated}
          formatter={formatter}
          style={[
            {
              width: (radius - strokeWidth) * 2,
              fontSize: radius / 2 - strokeWidth,
              color: textColor ?? color,
            },
            styles.text,
            textStyle,
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  text: { fontWeight: "900", textAlign: "center" },
  center: { justifyContent: "center", alignItems: "center" },
});
