FROM debian:bookworm as fluidsynth-builder

# Install build dependencies
RUN apt-get update && apt-get install -y \ 
    build-essential \
    gcc-aarch64-linux-gnu \
    g++-aarch64-linux-gnu \
    cmake \
    libglib2.0-dev \
    wget \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set cross-compilation environment
ENV CROSS_COMPILE=aarch64-linux-gnu-
ENV CC=${CROSS_COMPILE}gcc
ENV CXX=${CROSS_COMPILE}g++
ENV AR=${CROSS_COMPILE}ar
ENV LD=${CROSS_COMPILE}ld
ENV STRIP=${CROSS_COMPILE}strip

# Build FluidSynth 2.4.1 for ARM64
RUN mkdir -p /tmp/fluidsynth && \
    cd /tmp/fluidsynth && \
    wget https://github.com/FluidSynth/fluidsynth/archive/refs/tags/v2.4.1.tar.gz && \
    tar xzf v2.4.1.tar.gz && \
    cd fluidsynth-2.4.1 && \
    mkdir build && \
    cd build && \
    cmake .. \
        -DCMAKE_INSTALL_PREFIX=/usr/aarch64-linux-gnu \
        -DCMAKE_C_COMPILER=${CC} \
        -DCMAKE_CXX_COMPILER=${CXX} \
        -DCMAKE_SYSTEM_NAME=Linux \
        -DCMAKE_SYSTEM_PROCESSOR=aarch64 \
        -DCMAKE_FIND_ROOT_PATH=/usr/aarch64-linux-gnu && \
    make -j$(nproc) && \
    make install

# Second stage - actual builder
FROM debian:bookworm

# Copy FluidSynth from builder
COPY --from=fluidsynth-builder /usr/aarch64-linux-gnu /usr/aarch64-linux-gnu

# Install build dependencies for plugin building
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc-aarch64-linux-gnu \
    g++-aarch64-linux-gnu \
    libglib2.0-dev \
    libasound2-dev \
    libsndfile1-dev \
    libpulse-dev \
    lv2-dev \
    pkg-config \
    make \
    jq \
    zip \
    fluidsynth \
    libfluidsynth-dev \
    && rm -rf /var/lib/apt/lists/*

# Add symlink for FluidSynth shared libraries
RUN ln -s /usr/lib/aarch64-linux-gnu/libfluidsynth.so.3 /usr/lib/libfluidsynth.so.3 || true

# Set cross-compilation environment
ENV CROSS_COMPILE=aarch64-linux-gnu-
ENV CC=${CROSS_COMPILE}gcc
ENV CXX=${CROSS_COMPILE}g++
ENV AR=${CROSS_COMPILE}ar
ENV LD=${CROSS_COMPILE}ld
ENV STRIP=${CROSS_COMPILE}strip
# Enable debug mode by default for better logging
ENV DEBUG=1

# Create working directory
WORKDIR /build

# Copy main sf2lv2 source
COPY sf2lv2/ /build/sf2lv2/

# Create directories for input/output
RUN mkdir -p /input /output

# Copy build script
COPY docker/build.sh /build/
RUN chmod +x /build/build.sh

# Default command
CMD ["/build/build.sh"] 
